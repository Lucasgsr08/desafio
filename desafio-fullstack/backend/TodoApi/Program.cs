using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Adicionar serviços ao contêiner
builder.Services.AddControllers()
    .AddNewtonsoftJson();

// Configurar HttpClient para a sincronização
builder.Services.AddHttpClient();

// Configurar Entity Framework (SQLite padrão)
builder.Services.AddDbContext<TodoContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=todo.db"));

// Registrar serviços
builder.Services.AddScoped<ITodoService, TodoService>();
builder.Services.AddScoped<IUserService, UserService>();

// Configurar JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev_secret_key_please_change";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

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
        // In development recreate the database to ensure new tables (Users) exist
        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();
        
        // Criar usuários de exemplo primeiro para evitar que tasks referenciem IDs inexistentes
        if (!context.Users.Any())
        {
            // senha padrão: "password"
            string plain = "password";

            var usersToCreate = new[] { "user1", "user2", "user3" };
            foreach (var username in usersToCreate)
            {
                var salt = System.Security.Cryptography.RandomNumberGenerator.GetBytes(16);
                var hash = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(System.Text.Encoding.UTF8.GetBytes(plain), salt, 100_000, System.Security.Cryptography.HashAlgorithmName.SHA256, 32);
                var user = new TodoApi.Models.User
                {
                    Username = username,
                    PasswordSalt = Convert.ToBase64String(salt),
                    PasswordHash = Convert.ToBase64String(hash)
                };
                context.Users.Add(user);
            }
            context.SaveChanges();
            Console.WriteLine("✅ Usuários de exemplo criados: user1, user2, user3 (senha: password)");
        }

        // Adicionar alguns dados de exemplo vinculados aos usuários existentes
        if (!context.Todos.Any())
        {
            var user1 = context.Users.First(u => u.Username == "user1");
            var user2 = context.Users.First(u => u.Username == "user2");
            var user3 = context.Users.First(u => u.Username == "user3");

            context.Todos.AddRange(
                // Usuário 1 com 5 tarefas INCOMPLETAS (para testar a regra)
                new TodoApi.Models.Todo { UserId = user1.Id, Title = "Comprar leite", Completed = false },
                new TodoApi.Models.Todo { UserId = user1.Id, Title = "Estudar ASP.NET", Completed = false },
                new TodoApi.Models.Todo { UserId = user1.Id, Title = "Revisar código", Completed = false },
                new TodoApi.Models.Todo { UserId = user1.Id, Title = "Testar API", Completed = false },
                new TodoApi.Models.Todo { UserId = user1.Id, Title = "Documentar projeto", Completed = false },

                // Uma tarefa COMPLETA do usuário 1 para testar a atualização
                new TodoApi.Models.Todo { UserId = user1.Id, Title = "Estudar C# - Concluído", Completed = true },

                // Outros usuários
                new TodoApi.Models.Todo { UserId = user2.Id, Title = "Fazer exercícios", Completed = false },
                new TodoApi.Models.Todo { UserId = user2.Id, Title = "Ler livro técnico", Completed = true },
                new TodoApi.Models.Todo { UserId = user3.Id, Title = "Configurar ambiente", Completed = false },
                new TodoApi.Models.Todo { UserId = user3.Id, Title = "Reunião de planejamento", Completed = true }
            );
            context.SaveChanges();

            Console.WriteLine("✅ Seed executado! Usuário 1 tem 5 tarefas incompletas.");
            Console.WriteLine("✅ Tarefa completa adicionada para testar a regra de negócio.");
        }
    }
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();