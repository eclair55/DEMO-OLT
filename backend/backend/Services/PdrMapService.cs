using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Xml.Linq;

namespace OltNetworkApi.Services;

public class PdrMapService : IPdrMapService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PdrMapService> _logger;

    private const string ServiceUrl = "http://10.30.122.181/PPGISSVC_GENERATE_LINK/PDRMap.svc";

    public PdrMapService(HttpClient httpClient, ILogger<PdrMapService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _httpClient.BaseAddress = new Uri(ServiceUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("text/xml"));
    }

    public async Task<ShortestPathResult?> GetShortestPathAsync(
        double startX,
        double startY,
        double endX,
        double endY,
        double maxSnapDistance = 0)
    {
        var request = new ShortestPathRequest
        {
            StartX = startX,
            StartY = startY,
            EndX = endX,
            EndY = endY,
            MaxSnapDistance = maxSnapDistance
        };

        var candidateBodies = new[]
        {
            BuildSoapBody(request),
            BuildSoapBodyAlt(request),
            BuildSoapBodyLegacy(request)
        };

        var candidateActions = new[]
        {
            "http://tempuri.org/IPDRMap/GetShortestPath",
            "http://tempuri.org/GetShortestPath",
            "PDRMap/GetShortestPath",
            "GetShortestPath"
        };

        foreach (var action in candidateActions)
        {
            foreach (var body in candidateBodies)
            {
                try
                {
                    using var message = new HttpRequestMessage(HttpMethod.Post, ServiceUrl)
                    {
                        Content = new StringContent(body, Encoding.UTF8, "text/xml")
                    };

                    message.Headers.Add("SOAPAction", action);

                    var response = await _httpClient.SendAsync(message);
                    if (!response.IsSuccessStatusCode)
                    {
                        continue;
                    }

                    var xml = await response.Content.ReadAsStringAsync();
                    if (string.IsNullOrWhiteSpace(xml))
                    {
                        continue;
                    }

                    var parsed = ParseShortestPathResult(xml);
                    if (parsed != null)
                    {
                        return parsed;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Attempt to call GetShortestPath with SOAPAction {SoapAction} failed.", action);
                }
            }
        }

        _logger.LogWarning(
            "GetShortestPath call failed for StartX={StartX}, StartY={StartY}, EndX={EndX}, EndY={EndY}, MaxSnapDistance={MaxSnapDistance}.",
            startX,
            startY,
            endX,
            endY,
            maxSnapDistance);

        return null;
    }

    private static string BuildSoapBody(ShortestPathRequest request)
    {
        var startX = request.StartX.ToString(CultureInfo.InvariantCulture);
        var startY = request.StartY.ToString(CultureInfo.InvariantCulture);
        var endX = request.EndX.ToString(CultureInfo.InvariantCulture);
        var endY = request.EndY.ToString(CultureInfo.InvariantCulture);
        var maxSnapDistance = request.MaxSnapDistance.ToString(CultureInfo.InvariantCulture);

        return $@"<?xml version=""1.0"" encoding=""utf-8""?>
<s:Envelope xmlns:s=""http://schemas.xmlsoap.org/soap/envelope/"" xmlns:tem=""http://tempuri.org/"" xmlns:pdr=""http://schemas.datacontract.org/2004/07/PDRMapSvc.Models"">
  <s:Body>
    <tem:GetShortestPath>
      <tem:request>
        <pdr:StartX>{startX}</pdr:StartX>
        <pdr:StartY>{startY}</pdr:StartY>
        <pdr:EndX>{endX}</pdr:EndX>
        <pdr:EndY>{endY}</pdr:EndY>
        <pdr:MaxSnapDistance>{maxSnapDistance}</pdr:MaxSnapDistance>
      </tem:request>
    </tem:GetShortestPath>
  </s:Body>
</s:Envelope>";
    }

    private static string BuildSoapBodyAlt(ShortestPathRequest request)
    {
        var startX = request.StartX.ToString(CultureInfo.InvariantCulture);
        var startY = request.StartY.ToString(CultureInfo.InvariantCulture);
        var endX = request.EndX.ToString(CultureInfo.InvariantCulture);
        var endY = request.EndY.ToString(CultureInfo.InvariantCulture);
        var maxSnapDistance = request.MaxSnapDistance.ToString(CultureInfo.InvariantCulture);

        return $@"<?xml version=""1.0"" encoding=""utf-8""?>
<s:Envelope xmlns:s=""http://schemas.xmlsoap.org/soap/envelope/"" xmlns:tem=""http://tempuri.org/"" xmlns:pdr=""http://schemas.datacontract.org/2004/07/PDRMapSvc.Models"">
  <s:Body>
    <tem:GetShortestPath xmlns:tem=""http://tempuri.org/"">
      <tem:request>
        <pdr:StartX>{startX}</pdr:StartX>
        <pdr:StartY>{startY}</pdr:StartY>
        <pdr:EndX>{endX}</pdr:EndX>
        <pdr:EndY>{endY}</pdr:EndY>
        <pdr:MaxSnapDistance>{maxSnapDistance}</pdr:MaxSnapDistance>
      </tem:request>
    </tem:GetShortestPath>
  </s:Body>
</s:Envelope>";
    }

    private static string BuildSoapBodyLegacy(ShortestPathRequest request)
    {
        var startX = request.StartX.ToString(CultureInfo.InvariantCulture);
        var startY = request.StartY.ToString(CultureInfo.InvariantCulture);
        var endX = request.EndX.ToString(CultureInfo.InvariantCulture);
        var endY = request.EndY.ToString(CultureInfo.InvariantCulture);
        var maxSnapDistance = request.MaxSnapDistance.ToString(CultureInfo.InvariantCulture);

        return $@"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"">
  <soap:Body>
    <GetShortestPath xmlns=""http://tempuri.org/"">
      <request xmlns:d4p1=""http://schemas.datacontract.org/2004/07/"">
        <d4p1:StartX>{startX}</d4p1:StartX>
        <d4p1:StartY>{startY}</d4p1:StartY>
        <d4p1:EndX>{endX}</d4p1:EndX>
        <d4p1:EndY>{endY}</d4p1:EndY>
        <d4p1:MaxSnapDistance>{maxSnapDistance}</d4p1:MaxSnapDistance>
      </request>
    </GetShortestPath>
  </soap:Body>
</soap:Envelope>";
    }

    private static ShortestPathResult? ParseShortestPathResult(string xml)
    {
        try
        {
            var doc = XDocument.Parse(xml);
            var resultElement = doc.Descendants()
                .FirstOrDefault(element =>
                    element.Name.LocalName.Equals("ShortestPathResult", StringComparison.OrdinalIgnoreCase) ||
                    element.Name.LocalName.Equals("GetShortestPathResult", StringComparison.OrdinalIgnoreCase));

            if (resultElement == null)
            {
                return null;
            }

            var result = new ShortestPathResult();
            foreach (var element in resultElement.Elements())
            {
                var name = element.Name.LocalName;
                switch (name)
                {
                    case "Status":
                        result.Status = element.Value;
                        break;
                    case "Message":
                        result.Message = element.Value;
                        break;
                    case "NetworkSrid":
                        result.NetworkSrid = ParseInt32(element.Value);
                        break;
                    case "DistanceMeters":
                        result.DistanceMeters = ParseDouble(element.Value);
                        break;
                    case "RouteWkt":
                    case "RouteWKT":
                        result.RouteWkt = element.Value;
                        break;
                    case "SnappedStartX":
                        result.SnappedStartX = ParseDouble(element.Value);
                        break;
                    case "SnappedStartY":
                        result.SnappedStartY = ParseDouble(element.Value);
                        break;
                    case "SnappedEndX":
                        result.SnappedEndX = ParseDouble(element.Value);
                        break;
                    case "SnappedEndY":
                        result.SnappedEndY = ParseDouble(element.Value);
                        break;
                    case "StartSnapDistance":
                        result.StartSnapDistance = ParseDouble(element.Value);
                        break;
                    case "EndSnapDistance":
                        result.EndSnapDistance = ParseDouble(element.Value);
                        break;
                    case "StartEdgeId":
                        result.StartEdgeId = ParseInt64(element.Value);
                        break;
                    case "EndEdgeId":
                        result.EndEdgeId = ParseInt64(element.Value);
                        break;
                    case "LoadedNodeCount":
                        result.LoadedNodeCount = ParseInt32(element.Value);
                        break;
                    case "LoadedEdgeCount":
                        result.LoadedEdgeCount = ParseInt32(element.Value);
                        break;
                    case "EdgeIds":
                        result.EdgeIds = element.Elements()
                            .Where(child => child.Name.LocalName.Equals("long", StringComparison.OrdinalIgnoreCase))
                            .Select(child => ParseInt64(child.Value))
                            .ToList();
                        break;
                    case "NetworkRevision":
                        result.NetworkRevision = ParseInt64(element.Value);
                        break;
                    case "SearchAttemptCount":
                        result.SearchAttemptCount = ParseInt32(element.Value);
                        break;
                }
            }

            return result;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static int ParseInt32(string value)
    {
        return int.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : 0;
    }

    private static long ParseInt64(string value)
    {
        return long.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : 0;
    }

    private static double ParseDouble(string value)
    {
        return double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : 0d;
    }
}
