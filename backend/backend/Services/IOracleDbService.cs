namespace OltNetworkApi.Services;

public record ProposedOltInsertRequest(
    string? CoId,
    string? CoName,
    string? CoOwner,
    string? SiteId,
    string? SiteName,
    string? TowerType,
    string? Technology,
    string? OltLocationType,
    string OltName,
    double Longitude,
    double Latitude
);

public interface IOracleDbService
{
    Task<IEnumerable<Dictionary<string, object?>>> GetOltsAsync();
    Task<IEnumerable<Dictionary<string, object?>>> GetOltNodesByCodeAsync(string oltCode);
    Task<IEnumerable<Dictionary<string, object?>>> GetParentSlotsByNodeAsync(string oltNode);
    Task<IEnumerable<Dictionary<string, object?>>> GetLcpBySlotAsync(string oltNode, int slotNumber);
    Task<IEnumerable<Dictionary<string, object?>>> GetNapsByLcpIdAsync(string odnContId);

    Task<IEnumerable<Dictionary<string, object?>>> getRoute(string LCP_FACILITY_ID, string NAP_FACILITY_ID);
    Task<IEnumerable<Dictionary<string, object?>>> SelectOdnWithinRedlineAsync(string redlineWkt, IEnumerable<string> facilityTypes);
    Task<IEnumerable<Dictionary<string, object?>>> GetStreetNameCategoriesAsync();
    Task<Dictionary<string, object?>?> GetOdnDetailsByFeatIdAsync(string featId);
    Task<Dictionary<string, object?>?> GetOltDetailsByFeatIdAsync(string featId);
    Task<int> CreateProposedOltAsync(ProposedOltInsertRequest request);
    string GetGeometrySrid();
}
