using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Services
{
    public interface ITodoService
    {
        Task<PaginatedResponse<TodoDto>> GetTodosAsync(TodoQueryParams queryParams);
        Task<TodoDto?> GetTodoByIdAsync(int id);
        Task<TodoDto> UpdateTodoAsync(int id, UpdateTodoDto updateDto);
        Task<int> SyncTodosAsync();
        Task<bool> CanUserHaveMoreIncompleteTodosAsync(int userId);
        Task<int> CountIncompleteTodosByUserAsync(int userId);
    }
}