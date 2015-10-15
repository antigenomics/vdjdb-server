package utils.ServerResponse.errors;

import utils.Configuration;

/**
 * Created by bvdmitri on 07.10.15.
 */

public enum ServerErrorCode {
    INVALID_SEARCH_PARAMETERS("Invalid search parameters", 1),
    NULL_TOKEN("Unauthorized access: null token", 2),
    BAD_TOKEN("Unauthorized access: bad token", 3),
    SEARCH_ERROR("Search error", 4),
    INVALID_FILE_NAME("Invalid file name", 5),
    MKDIR_FAILED("Making directory for sample is failed. Server is unavailable", 6),
    INVALID_FILE_UPLOAD_FORM("Invalid file upload form", 7),
    SAVE_FILE_FAILED("Saving sample file failed", 8),
    FILE_NOT_UNIQUE_NAME("You should use unique names for your files", 9),
    ERROR_WHILE_RENDERING_SAMPLE_FILE("Error while rendering sample file", 11),
    INVALID_COOKIE("Invalid cookie", 12),
    INVALID_REQUEST("Invalid request", 13),
    MAX_TOTAL_MUTATIONS_ERROR("Total parameter should be less than " + Configuration.maxTotalMutations, 14),
    FILE_IS_TOO_LARGE("File is too large", 15),
    MAX_FILE_COUNT_REACHED("You have exceeded the allowed number of samples. Remove some files to continue", 16),
    //TODO
    MAX_CLONOTYPES_COUNT_REACHED("Too many clonotypes in file", 17),
    FILE_DOES_NOT_EXIST("Sample file does not exist", 18);

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
