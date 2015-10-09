package utils.ServerErrors;

/**
 * Created by bvdmitri on 07.10.15.
 */

public enum ServerErrorCode {
    INVALID_SEARCH_PARAMETERS("Invalid search parameters", 1),
    NULL_TOKEN("Null token", 2),
    BAD_TOKEN("Bad token", 3),
    SEARCH_ERROR("Search error", 4);

    private String error;
    private int code;

    ServerErrorCode(String error, int code) {
        this.error = error;
        this.code = code;
    }

    public String getError() {
        return error;
    }

    public int getCode() {
        return code;
    }
}
