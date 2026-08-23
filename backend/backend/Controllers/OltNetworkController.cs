using Microsoft.AspNetCore.Mvc;
using OltNetworkApi.Services;

namespace OltNetworkApi.Controllers;

[ApiController]
[Route("api")]
public class OltNetworkController : ControllerBase
{
    private readonly IOracleDbService _dbService;
    private readonly ILogger<OltNetworkController> _logger;

    public OltNetworkController(IOracleDbService dbService, ILogger<OltNetworkController> logger)
    {
        _dbService = dbService;
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
}
