namespace OltNetworkApi.Services;

public interface IPdrMapService
{
    Task<ShortestPathResult?> GetShortestPathAsync(
        double startX,
        double startY,
        double endX,
        double endY,
        double maxSnapDistance = 0);
}
