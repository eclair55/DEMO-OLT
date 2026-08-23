using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace backend.tests;

public class OltNetworkApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OltNetworkApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetConfig_ReturnsSrid()
    {
        var response = await _client.GetAsync("/api/config");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("srid", out var sridProp));
        Assert.False(string.IsNullOrWhiteSpace(sridProp.GetString()));
    }

    [Fact]
    public async Task GetOlts_ReturnsOltListWithWkt()
    {
        var response = await _client.GetAsync("/api/olts");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var olts = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        Assert.NotNull(olts);
        Assert.NotEmpty(olts);

        var first = olts[0];
        Assert.True(first.ContainsKey("OLT_CODE") || first.ContainsKey("olt_code"));
        Assert.True(first.ContainsKey("WKT") || first.ContainsKey("wkt"));
    }

    [Fact]
    public async Task GetOltNodes_ReturnsNodesForCode()
    {
        const string testCode = "OLT1";
        var response = await _client.GetAsync($"/api/olts/{testCode}/nodes");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var nodes = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        Assert.NotNull(nodes);
        Assert.NotEmpty(nodes);
    }

    [Fact]
    public async Task GetParentSlots_ReturnsSlotsForNode()
    {
        const string testNode = "OLT1-NOD-001";
        var response = await _client.GetAsync($"/api/olt-nodes/{testNode}/parent-slots");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var slots = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        Assert.NotNull(slots);
        Assert.NotEmpty(slots);
    }

    [Fact]
    public async Task GetLcpBySlot_ReturnsLcpGeometries()
    {
        const string testNode = "OLT1-NOD-001";
        const int slot = 1;
        var response = await _client.GetAsync($"/api/olt-nodes/{testNode}/parent-slots/{slot}/lcp");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var lcps = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        Assert.NotNull(lcps);
        Assert.NotEmpty(lcps);
    }

    [Fact]
    public async Task GetNapsByLcpId_ReturnsConnectedNaps()
    {
        const string testLcpId = "LCP-OLT1-NOD-001-S1-A";
        var response = await _client.GetAsync($"/api/lcp/{testLcpId}/naps");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var naps = await response.Content.ReadFromJsonAsync<List<Dictionary<string, object>>>();
        Assert.NotNull(naps);
        Assert.NotEmpty(naps);
    }
}
