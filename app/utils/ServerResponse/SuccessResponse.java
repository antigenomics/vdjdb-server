package utils.ServerResponse;

public class SuccessResponse {
    private String message;

    public SuccessResponse(String message) {
        this.message = message;
    }

    public String getResult() {
        return "success";
    }

    public String getMessage() {
        return message;
    }
}
