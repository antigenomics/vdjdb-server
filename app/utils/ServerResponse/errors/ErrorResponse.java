package utils.ServerResponse.errors;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 07.10.15.
 */

public class ErrorResponse {
    private int errorsCount;
    private List<ServerError> errors;

    public ErrorResponse(int errorsCount, List<ServerError> errors) {
        this.errorsCount = errorsCount;
        this.errors = errors;
    }

    public ErrorResponse(ServerErrorCode code) {
        this.errorsCount = 1;
        this.errors = new ArrayList<>();
        errors.add(new ServerError(code));
    }



    public int getErrorsCount() {
        return errorsCount;
    }

    public List<ServerError> getErrors() {
        return errors;
    }

    public String getResult() {
        return "error";
    }
}
