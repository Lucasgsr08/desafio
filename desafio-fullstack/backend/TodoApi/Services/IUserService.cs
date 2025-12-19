using TodoApi.DTOs;

namespace TodoApi.Services
{
    public interface IUserService
    {
        Task<TodoApi.Models.User> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto?> AuthenticateAsync(LoginDto dto);
        Task<TodoApi.Models.User?> GetByIdAsync(int id);
    }
}
