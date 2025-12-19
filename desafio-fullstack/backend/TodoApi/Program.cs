using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Adicionar serviços ao contêiner
builder.Services.AddControllers()
    .AddNewtonsoftJson();

// Configurar HttpClient para a sincronização
builder.Services.AddHttpClient();

// Configurar Entity Framework
if (builder.Environment.IsDevelopment())
{
    // Para desenvolvimento rápido, use InMemory
    builder.Services.AddDbContext<TodoContext>(options =>
        options.UseInMemoryDatabase("TodoDb"));
}
else
{
    // Para produção, use SQL Server
    builder.Services.AddDbContext<TodoContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
}

// Registrar serviços
builder.Services.AddScoped<ITodoService, TodoService>();

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

// Configurar Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Todo API",
        Version = "v1",
        Description = "API para gerenciamento de tarefas"
    });
});

var app = builder.Build();

// Configurar o pipeline de requisição HTTP
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    
    // Seed inicial do banco de dados para desenvolvimento
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<TodoContext>();
        context.Database.EnsureCreated();
        
        // Adicionar alguns dados de exemplo
        if (!context.Todos.Any())
        {
            context.Todos.AddRange(
                // Usuário 1 com 5 tarefas INCOMPLETAS (para testar a regra)
                new TodoApi.Models.Todo { UserId = 1, Title = "Comprar leite", Completed = false },
                new TodoApi.Models.Todo { UserId = 1, Title = "Estudar ASP.NET", Completed = false },
                new TodoApi.Models.Todo { UserId = 1, Title = "Revisar código", Completed = false },
                new TodoApi.Models.Todo { UserId = 1, Title = "Testar API", Completed = false },
                new TodoApi.Models.Todo { UserId = 1, Title = "Documentar projeto", Completed = false },
                
                // Uma tarefa COMPLETA do usuário 1 para testar a atualização
                new TodoApi.Models.Todo { UserId = 1, Title = "Estudar C# - Concluído", Completed = true },
                
                // Outros usuários
                new TodoApi.Models.Todo { UserId = 2, Title = "Fazer exercícios", Completed = false },
                new TodoApi.Models.Todo { UserId = 2, Title = "Ler livro técnico", Completed = true },
                new TodoApi.Models.Todo { UserId = 3, Title = "Configurar ambiente", Completed = false },
                new TodoApi.Models.Todo { UserId = 3, Title = "Reunião de planejamento", Completed = true }
            );
            context.SaveChanges();
            
            Console.WriteLine("✅ Seed executado! Usuário 1 tem 5 tarefas incompletas.");
            Console.WriteLine("✅ Tarefa 6 (ID: 6) está completa para testar a regra de negócio.");
        }
        else
        {
            // Verificar quantas tarefas incompletas tem o usuário 1
            var incompleteCount = context.Todos
                .Where(t => t.UserId == 1 && !t.Completed)
                .Count();
            Console.WriteLine($"📊 Usuário 1 tem {incompleteCount} tarefas incompletas.");
        }
    }
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();