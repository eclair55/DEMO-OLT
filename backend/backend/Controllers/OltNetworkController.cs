using Microsoft.AspNetCore.Mvc;
using OltNetworkApi.Services;

namespace OltNetworkApi.Controllers;

[Route("api")]
public class OltNetworkController : ControllerBase
{
    private readonly IOracleDbService _dbService;
    private readonly IPdrMapService _pdrMapService;
    private readonly ILogger<OltNetworkController> _logger;


    public OltNetworkController(IOracleDbService dbService, IPdrMapService pdrMapService, ILogger<OltNetworkController> logger)
    {
        _dbService = dbService;
        _pdrMapService = pdrMapService;
        _logger = logger;
    }

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        return Ok(new
        {
            srid = _dbService.GetGeometrySrid()
        });
    }

    [HttpGet("olts")]
    public async Task<IActionResult> GetOlts()
    {
        try
        {
            var data = await _dbService.GetOltsAsync();
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching OLTs.");
            return StatusCode(500, new { message = "Unable to load OLT locations. Please check database connection." });
        }
    }

    [HttpGet("olts/{oltCode}/nodes")]
    public async Task<IActionResult> GetOltNodes(string oltCode)
    {
        try
        {
            var data = await _dbService.GetOltNodesByCodeAsync(oltCode);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching OLT nodes for {OltCode}", oltCode);
            return StatusCode(500, new { message = $"Unable to load OLT Nodes for {oltCode}." });
        }
    }

    [HttpGet("olt-nodes/{oltNode}/parent-slots")]
    public async Task<IActionResult> GetParentSlots(string oltNode)
    {
        try
        {
            var data = await _dbService.GetParentSlotsByNodeAsync(oltNode);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching parent slots for {OltNode}", oltNode);
            return StatusCode(500, new { message = $"Unable to load Parent Slots for {oltNode}." });
        }
    }

    [HttpGet("olt-nodes/{oltNode}/parent-slots/{slot}/lcp")]
    public async Task<IActionResult> GetLcpBySlot(string oltNode, int slot)
    {
        try
        {
            var data = await _dbService.GetLcpBySlotAsync(oltNode, slot);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching LCP for node {OltNode}, slot {Slot}", oltNode, slot);
            return StatusCode(500, new { message = $"Unable to load LCP for {oltNode} slot {slot}." });
        }
    }

    [HttpGet("lcp/{odnContId}/naps")]
    public async Task<IActionResult> GetNapsByLcpId(string odnContId)
    {
        try
        {
            var data = await _dbService.GetNapsByLcpIdAsync(odnContId);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching NAPs for LCP {OdnContId}", odnContId);
            return StatusCode(500, new { message = $"Unable to load NAPs for LCP {odnContId}." });
        }
    }

    [HttpGet("route")]
    public async Task<IActionResult> GetRoute([FromQuery] string LCP_FACILITY_ID, [FromQuery] string NAP_FACILITY_ID)
    {
        try
        {
            var data = await _dbService.getRoute(LCP_FACILITY_ID, NAP_FACILITY_ID);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching route for LCP {LcpFacilityId} and NAP {NapFacilityId}", LCP_FACILITY_ID, NAP_FACILITY_ID);
            return StatusCode(500, new { message = $"Unable to load route for LCP {LCP_FACILITY_ID} and NAP {NAP_FACILITY_ID}." });
        }
    }

    [HttpGet("shortest-path")]
    public async Task<IActionResult> GetShortestPath(
        [FromQuery] double startX,
        [FromQuery] double startY,
        [FromQuery] double endX,
        [FromQuery] double endY,
        [FromQuery] double maxSnapDistance = 0)
    {
        try
        {
            var result = await _pdrMapService.GetShortestPathAsync(startX, startY, endX, endY, maxSnapDistance);
            if (result == null)
            {
                return StatusCode(502, new { message = "Unable to fetch shortest path from the external PDR map service." });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching shortest path from external service for start ({StartX}, {StartY}) and end ({EndX}, {EndY})", startX, startY, endX, endY);
            return StatusCode(500, new { message = "Unable to compute shortest path." });
        }
    }

    [HttpPost("shortest-path")]
    public async Task<IActionResult> GetShortestPathPost([FromBody] ShortestPathRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Request body is required." });
        }

        try
        {
            var result = await _pdrMapService.GetShortestPathAsync(
                request.StartX,
                request.StartY,
                request.EndX,
                request.EndY,
                request.MaxSnapDistance);

            if (result == null)
            {
                return StatusCode(502, new { message = "Unable to fetch shortest path from the external PDR map service." });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching shortest path from external service using POST request.");
            return StatusCode(500, new { message = "Unable to compute shortest path." });
        }
    }

    [HttpPost("nearest-selected-facility")]
    public async Task<IActionResult> GetNearestSelectedFacility([FromBody] NearestSelectedFacilityRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Request body is required." });
        }

        if (string.IsNullOrWhiteSpace(request.SourceTableName) || request.SourceFacilityIds.Count == 0)
        {
            return BadRequest(new { message = "SourceTableName and SourceFacilityIds are required." });
        }

        try
        {
            var result = await _pdrMapService.GetNearestSelectedFacilityAsync(request);
            return result == null
                ? StatusCode(502, new { message = "Unable to fetch nearest selected facility results from the external PDR map service." })
                : Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching nearest selected facility results from external service.");
            return StatusCode(500, new { message = "Unable to find the nearest selected facility." });
        }
    }

    [HttpPost("redline/select-odn")]
    public async Task<IActionResult> SelectOdnWithinRedline([FromBody] RedlineSelectionRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Request body is required." });
        }

        if (string.IsNullOrWhiteSpace(request.RedlineWkt))
        {
            return BadRequest(new { message = "Redline geometry is required." });
        }

        if (request.FacilityTypes == null || request.FacilityTypes.Count == 0)
        {
            return BadRequest(new { message = "At least one facility type must be selected." });
        }

        try
        {
            var records = await _dbService.SelectOdnWithinRedlineAsync(request.RedlineWkt, request.FacilityTypes);
            return Ok(new { success = true, records = records });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error selecting ODN records within redline.");
            return StatusCode(500, new { message = "Unable to select ODN records within the redline." });
        }
    }

    [HttpGet("street-name-categories")]
    public async Task<IActionResult> GetStreetNameCategories()
    {
        try
        {
            return Ok(await _dbService.GetStreetNameCategoriesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching street name categories.");
            return StatusCode(500, new { message = "Unable to load street name categories." });
        }
    }

    [HttpPost("proposed-olts")]
    public async Task<IActionResult> CreateProposedOlt([FromBody] ProposedOltInsertRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Request body is required." });
        }

        if (string.IsNullOrWhiteSpace(request.OltName))
        {
            return BadRequest(new { message = "OLT_NAME is required." });
        }

        try
        {
            var rowsAffected = await _dbService.CreateProposedOltAsync(request);
            return Ok(new
            {
                success = true,
                rowsAffected,
                message = "Proposed OLT saved successfully."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating proposed OLT {OltName}.", request.OltName);
            return StatusCode(500, new { message = "Unable to save proposed OLT record." });
        }
    }
}
