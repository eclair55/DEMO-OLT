using System.Data;
using Oracle.ManagedDataAccess.Client;

namespace OltNetworkApi.Services;

public class OracleDbService : IOracleDbService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<OracleDbService> _logger;
    private readonly string _connectionString;
    private readonly string _srid;

    public OracleDbService(IConfiguration configuration, ILogger<OracleDbService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        // 1. Connection string can come from ENV or appsettings.json
        var envConn = Environment.GetEnvironmentVariable("ORACLE_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(envConn))
        {
            _connectionString = envConn;
        }
        else
        {
            _connectionString = _configuration.GetConnectionString("Oracle") ?? string.Empty;
        }

        // 2. Geometry SRID can come from ENV or appsettings.json (Default: 32651)
        var envSrid = Environment.GetEnvironmentVariable("GEOMETRY_SRID");
        if (!string.IsNullOrWhiteSpace(envSrid))
        {
            _srid = envSrid;
        }
        else
        {
            _srid = _configuration["GEOMETRY_SRID"] ?? "32651";
        }
    }

    public string GetGeometrySrid() => _srid;

    private bool IsRealConnectionStringValid()
    {
        return !string.IsNullOrWhiteSpace(_connectionString) &&
               !_connectionString.Contains("YOUR_ORACLE_CONNECTION_STRING") &&
               !_connectionString.Contains("DUMMY");
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetOltsAsync()
    {
        if (!IsRealConnectionStringValid())
        {
            _logger.LogInformation("Oracle connection string not configured or dummy. Returning mock OLT data.");
            return GetMockOlts();
        }

        const string sql = @"
            SELECT SDO_UTIL.TO_WKTGEOMETRY(GEOMETRY) AS WKT,
                   OLT_CODE
            FROM OLT_GEOM";

        try
        {
            return await ExecuteQueryAsync(sql);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute GetOlts query. Falling back to mock data.");
            return GetMockOlts();
        }
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetOltNodesByCodeAsync(string oltCode)
    {
        if (!IsRealConnectionStringValid())
        {
            _logger.LogInformation("Oracle connection string not configured. Returning mock OLT nodes for {OltCode}.", oltCode);
            return GetMockOltNodes(oltCode);
        }

        const string sql = "SELECT * FROM TABLE(GET_OLT_BY_CODE(:oltCode))";
        var parameters = new[] { new OracleParameter("oltCode", oltCode) };

        try
        {
            return await ExecuteQueryAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed GET_OLT_BY_CODE for {OltCode}. Falling back to mock data.", oltCode);
            return GetMockOltNodes(oltCode);
        }
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetParentSlotsByNodeAsync(string oltNode)
    {
        if (!IsRealConnectionStringValid())
        {
            _logger.LogInformation("Oracle connection string not configured. Returning mock parent slots for {OltNode}.", oltNode);
            return GetMockParentSlots(oltNode);
        }

        const string sql = "SELECT * FROM TABLE(GET_PARENT_SLOTS(:oltNode))";
        var parameters = new[] { new OracleParameter("oltNode", oltNode) };

        try
        {
            return await ExecuteQueryAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed GET_PARENT_SLOTS for {OltNode}. Falling back to mock data.", oltNode);
            return GetMockParentSlots(oltNode);
        }
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetLcpBySlotAsync(string oltNode, int slotNumber)
    {
        if (!IsRealConnectionStringValid())
        {
            _logger.LogInformation("Oracle connection string not configured. Returning mock LCPs for node {OltNode}, slot {Slot}.", oltNode, slotNumber);
            return GetMockLcps(oltNode, slotNumber);
        }

        const string sql = "SELECT * FROM TABLE(GET_ODN_CONT_BY_SLOT(:oltNode, :slotNumber))";
        var parameters = new[]
        {
            new OracleParameter("oltNode", oltNode),
            new OracleParameter("slotNumber", slotNumber)
        };

        try
        {
            return await ExecuteQueryAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed GET_ODN_CONT_BY_SLOT for {OltNode}, slot {Slot}. Falling back to mock data.", oltNode, slotNumber);
            return GetMockLcps(oltNode, slotNumber);
        }
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetNapsByLcpIdAsync(string odnContId)
    {
        if (!IsRealConnectionStringValid())
        {
            _logger.LogInformation("Oracle connection string not configured. Returning mock NAPs for LCP {OdnContId}.", odnContId);
            return GetMockNaps(odnContId);
        }

        const string sql = "SELECT * FROM TABLE(GET_ODN_CONT_BY_ID(:odnContId))";
        var parameters = new[] { new OracleParameter("odnContId", odnContId) };

        try
        {
            return await ExecuteQueryAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed GET_ODN_CONT_BY_ID for {OdnContId}. Falling back to mock data.", odnContId);
            return GetMockNaps(odnContId);
        }
    }


    public async Task<IEnumerable<Dictionary<string, object?>>> getRoute(string LCP_FACILITY_ID, string NAP_FACILITY_ID)
    {
        if (!IsRealConnectionStringValid())
        {
            return null;
        }

        const string sql = @"SELECT FACILITY_ID,WKT
                    FROM TABLE(
                        GET_FACILITY_NETWORK_WKT_UN(
                            'ODN_CONT_GEOM',
                            'ODNC_FACILITY_ID',
                            :LCP_FACILITY_ID,

                            'ODN_CONT_GEOM',
                            'ODNC_FACILITY_ID',
                            :NAP_FACILITY_ID
                        )
                    ) WHERE GEOMETRY_TYPE = 'LINESTRING'";
        var parameters = new[]
          {
            new OracleParameter("LCP_FACILITY_ID", LCP_FACILITY_ID),
            new OracleParameter("NAP_FACILITY_ID", NAP_FACILITY_ID)
        };

        try
        {
            return await ExecuteQueryAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            return null;
        }
    }

    private async Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql, OracleParameter[]? parameters = null)
    {
        var results = new List<Dictionary<string, object?>>();

        using var connection = new OracleConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = sql;
        if (parameters != null)
        {
            command.Parameters.AddRange(parameters);
        }

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < reader.FieldCount; i++)
            {
                var name = reader.GetName(i);
                var val = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[name] = val;
            }
            results.Add(row);
        }

        return results;
    }

    // --- MOCK DATA FOR DEMO / OFF-DATABASE EXECUTION ---
    // Note: Coordinates in EPSG:32651 (UTM Zone 51N - Metro Manila / Luzon Philippines sample area)
    private static IEnumerable<Dictionary<string, object?>> GetMockOlts()
    {
        return new List<Dictionary<string, object?>>
        {
            new() { { "WKT", "POINT(281500 1612000)" }, { "OLT_CODE", "OLT1" } },
            new() { { "WKT", "POINT(284000 1615000)" }, { "OLT_CODE", "OLT2" } },
            new() { { "WKT", "POINT(279000 1608000)" }, { "OLT_CODE", "OLT3" } }
        };
    }

    private static IEnumerable<Dictionary<string, object?>> GetMockOltNodes(string oltCode)
    {
        return new List<Dictionary<string, object?>>
        {
            new() { { "OLT_NODE", $"{oltCode}-NOD-001" }, { "STATUS", "Connected" }, { "VENDOR", "Huawei" }, { "CAPACITY", "16 Ports" } },
            new() { { "OLT_NODE", $"{oltCode}-NOD-002" }, { "STATUS", "Connected" }, { "VENDOR", "ZTE" }, { "CAPACITY", "32 Ports" } },
            new() { { "OLT_NODE", $"{oltCode}-NOD-003" }, { "STATUS", "Maintenance" }, { "VENDOR", "Nokia" }, { "CAPACITY", "16 Ports" } }
        };
    }

    private static IEnumerable<Dictionary<string, object?>> GetMockParentSlots(string oltNode)
    {
        return new List<Dictionary<string, object?>>
        {
            new() { { "SLOT_NUMBER", 1 }, { "SLOT_NAME", "Slot 1 (PON 01-08)" }, { "STATUS", "Active" }, { "TOTAL_PORTS", 8 } },
            new() { { "SLOT_NUMBER", 2 }, { "SLOT_NAME", "Slot 2 (PON 09-16)" }, { "STATUS", "Active" }, { "TOTAL_PORTS", 8 } },
            new() { { "SLOT_NUMBER", 3 }, { "SLOT_NAME", "Slot 3 (PON 17-24)" }, { "STATUS", "Reserved" }, { "TOTAL_PORTS", 8 } }
        };
    }

    private static IEnumerable<Dictionary<string, object?>> GetMockLcps(string oltNode, int slot)
    {
        // Offsets based on node & slot
        double baseX = 281500 + (slot * 800);
        double baseY = 1612000 + (slot * 600);

        return new List<Dictionary<string, object?>>
        {
            new()
            {
                { "ODNC_ODN_CONT_ID", $"LCP-{oltNode}-S{slot}-A" },
                { "WKT", $"POLYGON(({baseX} {baseY}, {baseX + 400} {baseY}, {baseX + 400} {baseY + 400}, {baseX} {baseY + 400}, {baseX} {baseY}))" },
                { "CONTAINER_TYPE", "LCP" },
                { "CAPACITY", "64 Splice" }
            },
            new()
            {
                { "ODNC_ODN_CONT_ID", $"LCP-{oltNode}-S{slot}-B" },
                { "WKT", $"LINESTRING({baseX + 500} {baseY + 500}, {baseX + 900} {baseY + 700}, {baseX + 1200} {baseY + 800})" },
                { "CONTAINER_TYPE", "LCP Cable Route" },
                { "CAPACITY", "128 Splice" }
            }
        };
    }

    private static IEnumerable<Dictionary<string, object?>> GetMockNaps(string odnContId)
    {
        // Scatter NAPs near LCP
        double baseX = 282000;
        double baseY = 1612500;

        return new List<Dictionary<string, object?>>
        {
            new()
            {
                { "NAP_ID", $"NAP-{odnContId}-01" },
                { "ODNC_ODN_CONT_ID", odnContId },
                { "WKT", $"POINT({baseX + 100} {baseY + 100})" },
                { "STATUS", "Active" },
                { "PORT_COUNT", 8 }
            },
            new()
            {
                { "NAP_ID", $"NAP-{odnContId}-02" },
                { "ODNC_ODN_CONT_ID", odnContId },
                { "WKT", $"POINT({baseX + 250} {baseY + 180})" },
                { "STATUS", "Active" },
                { "PORT_COUNT", 8 }
            },
            new()
            {
                { "NAP_ID", $"NAP-{odnContId}-03" },
                { "ODNC_ODN_CONT_ID", odnContId },
                { "WKT", $"POINT({baseX + 380} {baseY + 300})" },
                { "STATUS", "Available" },
                { "PORT_COUNT", 16 }
            }
        };
    }
}
