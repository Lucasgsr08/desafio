namespace TodoApi.DTOs
{
    public class TodoDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool Completed { get; set; }
    }
    
    public class CreateTodoDto
    {
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool Completed { get; set; }
    }
    
    public class UpdateTodoDto
    {
        public bool Completed { get; set; }
    }
    
    public class PaginatedResponse<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
        public List<T> Items { get; set; } = new List<T>();
    }
    
    public class TodoQueryParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Title { get; set; }
        public string? SortBy { get; set; } = "id";
        public string? Order { get; set; } = "asc";
        public int? UserId { get; set; }
        public bool? Completed { get; set; }
    }
}