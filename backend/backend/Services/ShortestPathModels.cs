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
