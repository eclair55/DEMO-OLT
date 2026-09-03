using System.Text.Json.Serialization;

namespace OltNetworkApi.Services;

public class ShortestPathRequest
{
    public double StartX { get; set; }
    public double StartY { get; set; }
    public double EndX { get; set; }
    public double EndY { get; set; }
    public double MaxSnapDistance { get; set; }
}

public class ShortestPathResult
{
    public ShortestPathResult()
    {
        EdgeIds = new List<long>();
    }

    public string? Status { get; set; }
    public string? Message { get; set; }
    public int NetworkSrid { get; set; }
    public double DistanceMeters { get; set; }
    public string? RouteWkt { get; set; }
    public double SnappedStartX { get; set; }
    public double SnappedStartY { get; set; }
    public double SnappedEndX { get; set; }
    public double SnappedEndY { get; set; }
    public double StartSnapDistance { get; set; }
    public double EndSnapDistance { get; set; }
    public long StartEdgeId { get; set; }
    public long EndEdgeId { get; set; }
    public int LoadedNodeCount { get; set; }
    public int LoadedEdgeCount { get; set; }
    public List<long> EdgeIds { get; set; }
    public long NetworkRevision { get; set; }
    public int SearchAttemptCount { get; set; }
}


public class RedlineSelectionRequest
{
    public string? RedlineWkt { get; set; }
    public List<string>? FacilityTypes { get; set; }
}

public class NearestSelectedFacilityRequest
{
    public int SourceLayerId { get; set; }
    public string? SourceTableName { get; set; }
    public List<string> SourceFacilityIds { get; set; } = new();
    public int DestinationLayerId { get; set; }
    public string? DestinationTableName { get; set; }
    public bool RestrictToProvince { get; set; }
    public List<int> ExcludedStreetNameCategories { get; set; } = new();
    public double MaxSourceSnapDistance { get; set; }
    public double MaxDestinationSnapDistance { get; set; }
}

public class NearestSelectedFacilityResult
{
    public string? Status { get; set; }
    public string? Message { get; set; }
    public string? SourceTableName { get; set; }
    public string? DestinationTableName { get; set; }
    public bool RestrictToProvince { get; set; }
    public List<int> ExcludedStreetNameCategories { get; set; } = new();
    public int RequestedSourceCount { get; set; }
    public int SuccessfulSourceCount { get; set; }
    public int FailedSourceCount { get; set; }
    public int NetworkSrid { get; set; }
    public long NetworkRevision { get; set; }
    public List<NearestSelectedFacilityItem> Results { get; set; } = new();
}

public class NearestSelectedFacilityItem
{
    [JsonPropertyName("ODNC_FACILITY_ID")]
    public string? ODNC_FACILITY_ID { get; set; }
    [JsonPropertyName("ODNC_ODN_CONT_ID")]
    public string? ODNC_ODN_CONT_ID { get; set; }
    [JsonPropertyName("ODNC_CONT_TYPE")]
    public string? ODNC_CONT_TYPE { get; set; }
    [JsonPropertyName("OLT_CODE")]
    public string? OLT_CODE { get; set; }
    [JsonPropertyName("OLT_NAME")]
    public string? OLT_NAME { get; set; }
    [JsonPropertyName("STATUS")]
    public string? FacilityStatus { get; set; }
    public string? SourceFacilityId { get; set; }
    public string? DestinationFacilityId { get; set; }
    [JsonPropertyName("distanceMeters")]
    public double DistanceMeters { get; set; }
    public string? RouteWkt { get; set; }
    [JsonPropertyName("ResultStatus")]
    public string? Status { get; set; }
    public string? Message { get; set; }
    public string? ProvinceCode { get; set; }
    public double SourceX { get; set; }
    public double SourceY { get; set; }
    public double SnappedSourceX { get; set; }
    public double SnappedSourceY { get; set; }
    public double DestinationX { get; set; }
    public double DestinationY { get; set; }
    public double SnappedDestinationX { get; set; }
    public double SnappedDestinationY { get; set; }
    public double SourceSnapDistanceMeters { get; set; }
    public double DestinationSnapDistanceMeters { get; set; }
    public double TotalAccessDistanceMeters { get; set; }
    public long SourceEdgeId { get; set; }
    public long DestinationEdgeId { get; set; }
    public int CandidateCount { get; set; }
    public int SnappableCandidateCount { get; set; }
    public int SearchAttemptCount { get; set; }
    public int LoadedNodeCount { get; set; }
    public int LoadedEdgeCount { get; set; }
    public List<long> EdgeIds { get; set; } = new();
}