package utils.ServerResponse;

/**
 * Created by bvdmitri on 07.10.15.
 */

public class ServerError {
    private String message;
    private ServerErrorCode errorCode;

    public ServerError(String message, ServerErrorCode errorCode) {
        this.message = message;
        this.errorCode = errorCode;
    }

    public String getMessage() {
        return message;
    }

    public ServerErrorCode getErrorCode() {
        return errorCode;
    }
}
