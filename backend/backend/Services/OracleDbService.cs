using System.Data;
using Oracle.ManagedDataAccess.Client;

namespace OltNetworkApi.Services;

public readonly record struct UtmPoint(double X, double Y);

public readonly record struct SpatialInsertDefaults(int ClassId, int RevisionNumber, long FeatId);

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
                   OLT_CODE, 'LIVE' AS STATUS
            FROM OLT_GEOM
            UNION ALL
            SELECT SDO_UTIL.TO_WKTGEOMETRY(GEOMETRY) AS WKT,
                   OLT_CODE , 'PROPOSED' AS STATUS
            FROM PROPOSED_OLT_GEOM";
            

        try
        {
            return await ExecuteQueryAsync(sql);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute GetOlts query. Falling back to mock data.");
            //return GetMockOlts();
            throw;
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

        //try
        //{
            var results = await ExecuteQueryAsync(sql, parameters);
            return results;
        //}
        //catch (Exception ex)
        //{
        //    _logger.LogError(ex, "Failed GET_OLT_BY_CODE for {OltCode}. Falling back to mock data.", oltCode);
        //    //return GetMockOltNodes(oltCode);
        //    return null;
        //}
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

        //try
        //{
            var results = await ExecuteQueryAsync(sql, parameters);
            return results;
        //}
        //catch (Exception ex)
        //{
        //    _logger.LogError(ex, "Failed GET_PARENT_SLOTS for {OltNode}. Falling back to mock data.", oltNode);
        //    return GetMockParentSlots(oltNode);
        //}
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

        //try
        //{
            var results = await ExecuteQueryAsync(sql, parameters);
            return results;
        //}
        //catch (Exception ex)
        //{
        //    _logger.LogError(ex, "Failed GET_ODN_CONT_BY_SLOT for {OltNode}, slot {Slot}. Falling back to mock data.", oltNode, slotNumber);
        //    return GetMockLcps(oltNode, slotNumber);
        //}
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetNapsByLcpIdAsync(string odnContId)
    {
        //if (!IsRealConnectionStringValid())
        //{
        //    _logger.LogInformation("Oracle connection string not configured. Returning mock NAPs for LCP {OdnContId}.", odnContId);
        //    return GetMockNaps(odnContId);
        //}

        const string sql = "SELECT * FROM TABLE(GET_ODN_CONT_BY_ID(:odnContId))";
        var parameters = new[] { new OracleParameter("odnContId", odnContId) };

        //try
        //{
            var results = await ExecuteQueryAsync(sql, parameters);
            return results;
        //}
        //catch (Exception ex)
        //{
        //    _logger.LogError(ex, "Failed GET_ODN_CONT_BY_ID for {OdnContId}. Falling back to mock data.", odnContId);
        //    return GetMockNaps(odnContId);
        //}
    }


    public async Task<IEnumerable<Dictionary<string, object?>>> getRoute(string LCP_FACILITY_ID, string NAP_FACILITY_ID)
    {
        if (!IsRealConnectionStringValid())
        {
            return null!;
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
        catch (Exception)
        {
            return null!;
        }
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> SelectOdnWithinRedlineAsync(string redlineWkt, IEnumerable<string> facilityTypes)
    {
        if (!IsRealConnectionStringValid())
        {
            return Array.Empty<Dictionary<string, object?>>();
        }

        if (string.IsNullOrWhiteSpace(redlineWkt))
        {
            throw new ArgumentException("Redline geometry is required.", nameof(redlineWkt));
        }

        var selectedTypes = (facilityTypes ?? Enumerable.Empty<string>())
            .Where((type) => !string.IsNullOrWhiteSpace(type))
            .Select((type) => type.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (selectedTypes.Count == 0)
        {
            throw new ArgumentException("At least one facility type must be selected.", nameof(facilityTypes));
        }

        var normalizedTypes = selectedTypes
            .Select((type) => type.ToUpperInvariant())
            .ToList();

        var inClause = string.Join(", ", normalizedTypes.Select((_, index) => $":type{index}"));
        var sql = $@"
            SELECT ODNC_FACILITY_ID, ODNC_ODN_CONT_ID, ODNC_CONT_TYPE,FEATID,'ODN_CONT_GEOM' AS TABLE_NAME
            FROM ODN_CONT_GEOM
            WHERE UPPER(ODNC_CONT_TYPE) IN ({inClause})
              AND SDO_RELATE(
                GEOMETRY,
                SDO_GEOMETRY(
                    2003,
                    32651,
                    NULL,
                    SDO_UTIL.FROM_WKTGEOMETRY(:redlineWkt).SDO_ELEM_INFO,
                    SDO_UTIL.FROM_WKTGEOMETRY(:redlineWkt).SDO_ORDINATES
                ),
                'mask=ANYINTERACT'
              ) = 'TRUE'";

        var parameters = normalizedTypes
            .Select((type, index) => new OracleParameter($"type{index}", type))
            .Concat(new[]
            {
                new OracleParameter("redlineWkt", redlineWkt)
            })
            .ToArray();

        try
        {
            return await ExecuteQueryAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to select ODN records within redline geometry.");
            throw;
        }
    }

    public async Task<IEnumerable<Dictionary<string, object?>>> GetStreetNameCategoriesAsync()
    {
        if (!IsRealConnectionStringValid())
        {
            return Array.Empty<Dictionary<string, object?>>();
        }

        const string sql = @"
            SELECT FIELD_VALUES, FALIAS
            FROM DROPDOWN_MAINTENANCE
            WHERE TABLENAME = 'STREET1_GEOM'
              AND FIELDNAME = 'ST_NAME_CAT'
            ORDER BY FALIAS ASC";

        return await ExecuteQueryAsync(sql);
    }

    public async Task<Dictionary<string, object?>?> GetOdnDetailsByFeatIdAsync(string featId)
    {
        const string sql = @"
            SELECT ODNC_FACILITY_ID, ODNC_ODN_CONT_ID, ODNC_CONT_TYPE
            FROM ODN_CONT_GEOM
            WHERE FEATID = :sourceFacilityId";

        var rows = await ExecuteQueryAsync(sql, new[] { new OracleParameter("sourceFacilityId", featId) });
        return rows.FirstOrDefault();
    }

    public async Task<Dictionary<string, object?>?> GetOltDetailsByFeatIdAsync(string featId)
    {
        const string sql = @"
            SELECT OLT_CODE, OLT_NAME, 'EXISTING' AS STATUS
            FROM OLT_GEOM
            WHERE FEATID = :destinationFacilityId
            UNION ALL
            SELECT OLT_CODE, OLT_NAME, 'PROPOSED' AS STATUS
            FROM PROPOSED_OLT_GEOM
            WHERE FEATID = :destinationFacilityId";

        var rows = await ExecuteQueryAsync(sql, new[] { new OracleParameter("destinationFacilityId", featId) });
        return rows.FirstOrDefault();
    }

    public static SpatialInsertDefaults GetSpatialInsertDefaults()
    {
        var featId = DateTime.UtcNow.Ticks;
        return new SpatialInsertDefaults(1174, 0, featId);
    }

    public static UtmPoint ConvertLongitudeLatitudeToUtm32651(double longitude, double latitude)
    {
        const double semiMajorAxis = 6378137.0;
        const double flattening = 1.0 / 298.257223563;
        const double eSquared = flattening * (2.0 - flattening);
        const double k0 = 0.9996;
        const double zoneNumber = 51;
        const double centralMeridian = (zoneNumber - 1) * 6.0 - 180.0 + 3.0;

        var latRad = latitude * Math.PI / 180.0;
        var lonRad = longitude * Math.PI / 180.0;
        var deltaLon = lonRad - centralMeridian * Math.PI / 180.0;

        var sinLat = Math.Sin(latRad);
        var cosLat = Math.Cos(latRad);
        var tanLat = Math.Tan(latRad);
        var cosSquared = cosLat * cosLat;
        var sinSquared = sinLat * sinLat;

        var ePrimeSquared = eSquared / (1.0 - eSquared);
        var m = semiMajorAxis * (
            (1.0 - eSquared / 4.0 - 3.0 * eSquared * eSquared / 64.0 - 5.0 * Math.Pow(eSquared, 3.0) / 256.0) * latRad
            - (3.0 * eSquared / 8.0 + 3.0 * Math.Pow(eSquared, 2.0) / 32.0 + 45.0 * Math.Pow(eSquared, 3.0) / 1024.0) * Math.Sin(2.0 * latRad)
            + (15.0 * Math.Pow(eSquared, 2.0) / 256.0 + 45.0 * Math.Pow(eSquared, 3.0) / 1024.0) * Math.Sin(4.0 * latRad)
            - (35.0 * Math.Pow(eSquared, 3.0) / 3072.0) * Math.Sin(6.0 * latRad)
        );

        var e1 = (1.0 - Math.Sqrt(1.0 - eSquared)) / (1.0 + Math.Sqrt(1.0 - eSquared));
        var c = ePrimeSquared * cosSquared;
        var t = tanLat * tanLat;
        var n = semiMajorAxis / Math.Sqrt(1.0 - eSquared * sinSquared);
        var r = semiMajorAxis * (1.0 - eSquared) / Math.Pow(1.0 - eSquared * sinSquared, 1.5);

        var x = k0 * (m + n * tanLat * (
            deltaLon * deltaLon / 2.0
            + (5.0 - t + 9.0 * c + 4.0 * c * c) * Math.Pow(deltaLon, 4.0) / 24.0
            + (61.0 - 58.0 * t + t * t + 600.0 * c - 330.0 * ePrimeSquared) * Math.Pow(deltaLon, 6.0) / 720.0
        ));

        var easting = k0 * (n * (
            deltaLon
            + (1.0 - t + c) * Math.Pow(deltaLon, 3.0) / 6.0
            + (5.0 - 18.0 * t + t * t + 72.0 * c - 58.0 * ePrimeSquared) * Math.Pow(deltaLon, 5.0) / 120.0
        ) * cosLat + 500000.0);

        var northing = x;
        if (latitude < 0)
        {
            northing += 10000000.0;
        }

        return new UtmPoint(Math.Round(easting, 6), Math.Round(northing, 6));
    }

    public async Task<int> CreateProposedOltAsync(ProposedOltInsertRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.OltName))
        {
            throw new ArgumentException("OLT_NAME is required.", nameof(request));
        }

        if (!IsRealConnectionStringValid())
        {
            _logger.LogInformation("Oracle connection string not configured. Skipping PROPOSED_OLT_GEOM insert for {OltName}.", request.OltName);
            return 0;
        }

        var projected = ConvertLongitudeLatitudeToUtm32651(request.Longitude, request.Latitude);
        var x = projected.X;
        var y = projected.Y;

        var defaults = GetSpatialInsertDefaults();

        const string sql = @"
            INSERT INTO PROPOSED_OLT_GEOM (
                CLASSID,
                REVISIONNUMBER,
                FEATID,
                CO_ID,
                CO_NAME,
                CO_OWNER,
                SITE_ID,
                SITENAME,
                TOWER_TYPE,
                TECHNOLOGY,
                OLT_LOCATION_TYPE,
                OLT_NAME,
                GEOMETRY,
                LAT,
                LON
            ) VALUES (
                :CLASSID,
                :REVISIONNUMBER,
                :FEATID,
                :CO_ID,
                :CO_NAME,
                :CO_OWNER,
                :SITE_ID,
                :SITENAME,
                :TOWER_TYPE,
                :TECHNOLOGY,
                :OLT_LOCATION_TYPE,
                :OLT_NAME,
                SDO_CS.TRANSFORM (sdo_geometry (3001,8307,sdo_point_type (:LON, :LAT, NULL),NULL,NULL),32651) ,
                :LAT,
                :LON
            )";

        var parameters = new[]
        {
            new OracleParameter("CLASSID", defaults.ClassId),
            new OracleParameter("REVISIONNUMBER", defaults.RevisionNumber),
            new OracleParameter("FEATID", defaults.FeatId),
            new OracleParameter("CO_ID", string.IsNullOrWhiteSpace(request.CoId) ? DBNull.Value : request.CoId),
            new OracleParameter("CO_NAME", string.IsNullOrWhiteSpace(request.CoName) ? DBNull.Value : request.CoName),
            new OracleParameter("CO_OWNER", string.IsNullOrWhiteSpace(request.CoOwner) ? DBNull.Value : request.CoOwner),
            new OracleParameter("SITE_ID", string.IsNullOrWhiteSpace(request.SiteId) ? DBNull.Value : request.SiteId),
            new OracleParameter("SITENAME", string.IsNullOrWhiteSpace(request.SiteName) ? DBNull.Value : request.SiteName),
            new OracleParameter("TOWER_TYPE", string.IsNullOrWhiteSpace(request.TowerType) ? DBNull.Value : request.TowerType),
            new OracleParameter("TECHNOLOGY", string.IsNullOrWhiteSpace(request.Technology) ? DBNull.Value : request.Technology),
            new OracleParameter("OLT_LOCATION_TYPE", string.IsNullOrWhiteSpace(request.OltLocationType) ? DBNull.Value : request.OltLocationType),
            new OracleParameter("OLT_NAME", request.OltName),
            new OracleParameter("LON", request.Longitude),
            new OracleParameter("LAT", request.Latitude),
            new OracleParameter("LAT", request.Latitude),
            new OracleParameter("LON", request.Longitude)
        };

        try
        {
            using var connection = new OracleConnection(_connectionString);
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters);

            var affected = await command.ExecuteNonQueryAsync();
            return affected;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to insert proposed OLT {OltName} into PROPOSED_OLT_GEOM.", request.OltName);
            throw;
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
