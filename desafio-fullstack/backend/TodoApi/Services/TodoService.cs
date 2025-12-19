using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Services
{
    public class TodoService : ITodoService
    {
        private readonly TodoContext _context;
        private readonly ILogger<TodoService> _logger;
        private readonly HttpClient _httpClient;
        
        public TodoService(TodoContext context, ILogger<TodoService> logger, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient();
        }
        
        public async Task<PaginatedResponse<TodoDto>> GetTodosAsync(TodoQueryParams queryParams)
        {
            var query = _context.Todos.AsQueryable();
            
            // Aplicar filtros
            if (!string.IsNullOrEmpty(queryParams.Title))
            {
                query = query.Where(t => t.Title.Contains(queryParams.Title));
            }
            
            if (queryParams.UserId.HasValue)
            {
                query = query.Where(t => t.UserId == queryParams.UserId.Value);
            }
            
            if (queryParams.Completed.HasValue)
            {
                query = query.Where(t => t.Completed == queryParams.Completed.Value);
            }
            
            // Aplicar ordenação
            query = queryParams.SortBy?.ToLower() switch
            {
                "title" => queryParams.Order == "desc" 
                    ? query.OrderByDescending(t => t.Title)
                    : query.OrderBy(t => t.Title),
                "userid" => queryParams.Order == "desc"
                    ? query.OrderByDescending(t => t.UserId)
                    : query.OrderBy(t => t.UserId),
                "completed" => queryParams.Order == "desc"
                    ? query.OrderByDescending(t => t.Completed)
                    : query.OrderBy(t => t.Completed),
                _ => queryParams.Order == "desc"
                    ? query.OrderByDescending(t => t.Id)
                    : query.OrderBy(t => t.Id)
            };
            
            // Paginação
            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((queryParams.Page - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .Select(t => new TodoDto
                {
                    Id = t.Id,
                    UserId = t.UserId,
                    Title = t.Title,
                    Completed = t.Completed
                })
                .ToListAsync();
            
            return new PaginatedResponse<TodoDto>
            {
                Page = queryParams.Page,
                PageSize = queryParams.PageSize,
                TotalCount = totalCount,
                Items = items
            };
        }
        
        public async Task<TodoDto?> GetTodoByIdAsync(int id)
        {
            var todo = await _context.Todos.FindAsync(id);
            
            if (todo == null) return null;
            
            return new TodoDto
            {
                Id = todo.Id,
                UserId = todo.UserId,
                Title = todo.Title,
                Completed = todo.Completed
            };
        }
        
        public async Task<TodoDto> UpdateTodoAsync(int id, UpdateTodoDto updateDto)
        {
            var todo = await _context.Todos.FindAsync(id);
            
            if (todo == null)
            {
                throw new KeyNotFoundException($"Todo with id {id} not found");
            }
            
            // Validar regra de negócio: máximo 5 tarefas incompletas por usuário
            if (!updateDto.Completed)
            {
                var incompleteCount = await CountIncompleteTodosByUserAsync(todo.UserId);
                if (incompleteCount >= 5 && !todo.Completed)
                {
                    throw new InvalidOperationException(
                        $"User {todo.UserId} already has 5 incomplete todos. " +
                        "Complete some todos before adding more incomplete ones.");
                }
            }
            
            todo.Completed = updateDto.Completed;
            todo.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return new TodoDto
            {
                Id = todo.Id,
                UserId = todo.UserId,
                Title = todo.Title,
                Completed = todo.Completed
            };
        }
        
        public async Task<int> SyncTodosAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync("https://jsonplaceholder.typicode.com/todos");
                response.EnsureSuccessStatusCode();
                
                var json = await response.Content.ReadAsStringAsync();
                var externalTodos = Newtonsoft.Json.JsonConvert
                    .DeserializeObject<List<ExternalTodo>>(json);
                
                if (externalTodos == null || !externalTodos.Any())
                {
                    return 0;
                }
                
                var existingTodos = await _context.Todos.ToListAsync();
                var existingIds = existingTodos.Select(t => t.Id).ToHashSet();
                
                var newTodos = externalTodos
                    .Where(et => !existingIds.Contains(et.Id))
                    .Select(et => new Todo
                    {
                        Id = et.Id,
                        UserId = et.UserId,
                        Title = et.Title,
                        Completed = et.Completed,
                        CreatedAt = DateTime.UtcNow
                    })
                    .ToList();
                
                await _context.Todos.AddRangeAsync(newTodos);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"Synced {newTodos.Count} new todos");
                return newTodos.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing todos");
                throw;
            }
        }
        
        public async Task<bool> CanUserHaveMoreIncompleteTodosAsync(int userId)
        {
            var incompleteCount = await CountIncompleteTodosByUserAsync(userId);
            return incompleteCount < 5;
        }
        
        public async Task<int> CountIncompleteTodosByUserAsync(int userId)
        {
            return await _context.Todos
                .Where(t => t.UserId == userId && !t.Completed)
                .CountAsync();
        }
        
        private class ExternalTodo
        {
            public int Id { get; set; }
            public int UserId { get; set; }
            public string Title { get; set; } = string.Empty;
            public bool Completed { get; set; }
        }
    }
}