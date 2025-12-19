using Microsoft.EntityFrameworkCore;
using TodoApi.Models;

namespace TodoApi.Data
{
    public class TodoContext : DbContext
    {
        public TodoContext(DbContextOptions<TodoContext> options) : base(options)
        {
        }
        
        public DbSet<Todo> Todos { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Todo>()
                .HasIndex(t => new { t.UserId, t.Completed });
                
            modelBuilder.Entity<Todo>()
                .HasIndex(t => t.UserId);
        }
    }
}