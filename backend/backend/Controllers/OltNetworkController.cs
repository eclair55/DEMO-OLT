using Microsoft.AspNetCore.Mvc;
using OltNetworkApi.Services;

namespace OltNetworkApi.Controllers;

[ApiController]
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
}
