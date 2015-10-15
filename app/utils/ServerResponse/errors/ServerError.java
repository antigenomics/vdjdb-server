package utils.ServerResponse.errors;

/**
 * Created by bvdmitri on 07.10.15.
 */

public class ServerError {
    private String message;
    private ServerErrorCode errorCode;

    public ServerError(ServerErrorCode errorCode) {
        this.message = errorCode.getError();
        this.errorCode = errorCode;
    }

    public String getMessage() {
        return message;
    }

    public ServerErrorCode getErrorCode() {
        return errorCode;
    }
}
