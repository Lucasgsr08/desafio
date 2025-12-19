using Microsoft.AspNetCore.Mvc;
using TodoApi.DTOs;
using TodoApi.Services;

namespace TodoApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TodosController : ControllerBase
    {
        private readonly ITodoService _todoService;
        private readonly ILogger<TodosController> _logger;
        
        public TodosController(ITodoService todoService, ILogger<TodosController> logger)
        {
            _todoService = todoService;
            _logger = logger;
        }
        
        [HttpGet]
        public async Task<ActionResult<PaginatedResponse<TodoDto>>> GetTodos(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? title = null,
            [FromQuery] string? sort = "id",
            [FromQuery] string? order = "asc",
            [FromQuery] int? userId = null,
            [FromQuery] bool? completed = null)
        {
            try
            {
                var queryParams = new TodoQueryParams
                {
                    Page = page,
                    PageSize = pageSize,
                    Title = title,
                    SortBy = sort,
                    Order = order,
                    UserId = userId,
                    Completed = completed
                };
                
                var result = await _todoService.GetTodosAsync(queryParams);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting todos");
                return StatusCode(500, "An error occurred while processing your request");
            }
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult<TodoDto>> GetTodo(int id)
        {
            try
            {
                var todo = await _todoService.GetTodoByIdAsync(id);
                
                if (todo == null)
                {
                    return NotFound($"Todo with id {id} not found");
                }
                
                return Ok(todo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting todo with id {id}");
                return StatusCode(500, "An error occurred while processing your request");
            }
        }
        
        [HttpPut("{id}")]
        public async Task<ActionResult<TodoDto>> UpdateTodo(int id, [FromBody] UpdateTodoDto updateDto)
        {
            try
            {
                var updatedTodo = await _todoService.UpdateTodoAsync(id, updateDto);
                return Ok(updatedTodo);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating todo with id {id}");
                return StatusCode(500, "An error occurred while processing your request");
            }
        }
        
        [HttpPost("sync")]
        public async Task<ActionResult> SyncTodos()
        {
            try
            {
                var count = await _todoService.SyncTodosAsync();
                return Ok(new { message = $"Synced {count} new todos" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing todos");
                return StatusCode(500, "An error occurred while syncing todos");
            }
        }
        
        [HttpGet("users/{userId}/can-add-incomplete")]
        public async Task<ActionResult> CanUserAddIncompleteTodo(int userId)
        {
            try
            {
                var canAdd = await _todoService.CanUserHaveMoreIncompleteTodosAsync(userId);
                return Ok(new { userId, canAdd, maxIncomplete = 5 });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking user {userId} limit");
                return StatusCode(500, "An error occurred while processing your request");
            }
        }
    }
}