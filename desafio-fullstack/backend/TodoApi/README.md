# TodoApi

API ASP.NET Core para gerenciamento de tarefas (SQLite).

Como executar (Windows):

1. Restaurar pacotes e construir:

```powershell
dotnet restore
dotnet build
```

2. Rodar localmente (porta padrão configurada pelo ASP.NET Core):

```powershell
dotnet run
```

3. Endpoints:

- Swagger UI: `https://localhost:5001/swagger` (em ambiente de desenvolvimento)

Observações:

- O projeto usa SQLite por padrão com `Data Source=todo.db` (arquivo no diretório do projeto).
- Não remova pacotes essenciais sem testar; `Microsoft.EntityFrameworkCore.Design` é útil para migrações.
