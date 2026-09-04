using OltNetworkApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddRequestTimeouts(options =>
{
    options.DefaultPolicy = new()
    {
        Timeout = PdrMapService.ApiTimeout
    };
});

builder.Services.AddScoped<IOracleDbService, OracleDbService>();
builder.Services.AddHttpClient<IPdrMapService, PdrMapService>(client =>
{
    client.Timeout = PdrMapService.ApiTimeout;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRequestTimeouts();

app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "OltNetworkApi V1");
        options.RoutePrefix = "swagger";
    });
}

app.MapControllers();

app.Run();

public partial class Program { }
