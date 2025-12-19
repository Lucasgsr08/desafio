using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TodoApi.DTOs;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Services
{
    public class UserService : IUserService
    {
        private readonly TodoContext _context;
        private readonly IConfiguration _config;

        public UserService(TodoContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<User> RegisterAsync(RegisterDto dto)
        {
            var existing = _context.Users.FirstOrDefault(u => u.Username == dto.Username);
            if (existing != null)
            {
                throw new InvalidOperationException("Username already exists");
            }

            var salt = RandomNumberGenerator.GetBytes(16);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(dto.Password),
                salt,
                100_000,
                HashAlgorithmName.SHA256,
                32
            );

            var user = new User
            {
                Username = dto.Username,
                PasswordSalt = Convert.ToBase64String(salt),
                PasswordHash = Convert.ToBase64String(hash)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<AuthResponseDto?> AuthenticateAsync(LoginDto dto)
        {
            var user = _context.Users.FirstOrDefault(u => u.Username == dto.Username);
            if (user == null) return null;

            var salt = Convert.FromBase64String(user.PasswordSalt);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(dto.Password),
                salt,
                100_000,
                HashAlgorithmName.SHA256,
                32
            );

            if (Convert.ToBase64String(hash) != user.PasswordHash)
                return null;

            // 🔐 JWT KEY - CORREÇÃO CRÍTICA
            var key = _config["Jwt:Key"];

            if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
            {
                throw new InvalidOperationException(
                    "JWT Key is missing or must be at least 32 characters long"
                );
            }

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256
            );

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username)
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            return new AuthResponseDto
            {
                Token = tokenString,
                User = new TodoDto
                {
                    Id = user.Id,
                    UserId = user.Id,
                    Title = user.Username,
                    Completed = false
                }
            };
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }
    }
}
