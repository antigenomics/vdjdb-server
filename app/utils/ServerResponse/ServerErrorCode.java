package utils.ServerResponse;

/**
 * Created by bvdmitri on 07.10.15.
 */

public enum ServerErrorCode {
    INVALID_SEARCH_PARAMETERS("Invalid search parameters", 1),
    NULL_TOKEN("Null token", 2),
    BAD_TOKEN("Bad token", 3),
    SEARCH_ERROR("Search error", 4),
    INVALID_FILE_NAME("Invalid file name", 5),
    MKDIR_FAILED("Making directory for sample is failed", 6),
    INVALID_FILE_UPLOAD_FORM("Invalid file upload form", 7),
    SAVE_FILE_FAILED("Saving sample file failed", 8),
    FILE_NOT_UNIQUE_NAME("File not unique name", 9),
    ERROR_WHILE_RENDERING_SAMPLE_FILE("Error while rendering sample file", 11),
    INVALID_COOKIE("Invalid cookie", 12),
    INVALID_REQUEST("Invalid request", 13),
    MAX_TOTAL_MUTATIONS_ERROR("Max total mutations error", 14);

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
