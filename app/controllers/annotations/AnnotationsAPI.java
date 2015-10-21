package controllers.annotations;

import com.antigenomics.vdjtools.Software;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import controllers.Application;
import graph.Annotations.CachedAnnotations;
import graph.Annotations.RequestTreeSearchParameters;
import graph.Annotations.table.AnnotationRow;
import graph.CountPiechart.CachedCountPiechart;
import graph.Sunburst.CachedSunburst;
import models.SampleFile;
import models.Token;
import play.libs.F;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;
import utils.CommonUtil;
import utils.LogUtil;
import utils.ServerResponse.errors.ErrorResponse;
import utils.ServerResponse.errors.ServerErrorCode;
import utils.ServerResponse.SuccessResponse;

import java.io.File;
import java.util.List;
import java.util.Map;

public class AnnotationsAPI extends Controller {

    public static Result getFilesInfo() {
        Token token = Application.authtorize();
        return ok(Json.toJson(new Token.TokenInformation(token)));
    }

    public static Result upload() throws Exception {

        Token token = Application.authtorize();
        String uuid = token.getUuid();

        //Getting the file from request body
        Http.MultipartFormData body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart file = body.getFile("files[]");

        if (token.isMaxFilesCountExceeded()) {
            return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.MAX_FILE_COUNT_REACHED)));
        }

        if (token.getMaxFileSize() > 0) {
            Long sizeMB = file.getFile().length() / 1024;
            if (sizeMB > token.getMaxFileSize()) {
                return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.FILE_IS_TOO_LARGE)));
            }
        }

        String fileName = body.asFormUrlEncoded().containsKey("fileName") ? body.asFormUrlEncoded().get("fileName")[0] : file.getFilename();
        String pattern = "^[a-zA-Z0-9_.-]{1,40}$";
        if (fileName == null || !fileName.matches(pattern)) {
            return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.INVALID_FILE_NAME)));
        }

        for (SampleFile sampleFile : token.getFiles()) {
            if (sampleFile.getFileName().equals(fileName)) {
                return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.FILE_NOT_UNIQUE_NAME)));
            }
        }

        SampleFile sampleFile = null;
        try {
            if (!body.asFormUrlEncoded().containsKey("softwareTypeName")) {
                LogUtil.warnLog("Invalid file upload form", uuid);
                return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.INVALID_FILE_UPLOAD_FORM)));
            }
            String softwareTypeName = body.asFormUrlEncoded().get("softwareTypeName")[0];
            String uniqueFileName = CommonUtil.RandomStringGenerator.generateRandomString(20, CommonUtil.RandomStringGenerator.Mode.ALPHANUMERIC);
            String directoryFilePath = token.getUploadDirectory() + "/" + uniqueFileName + "/";
            File fileDirectory = new File(directoryFilePath);
            if (!fileDirectory.mkdir()) {
                LogUtil.errorLog("Making directory is failed", uuid);
                return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.MKDIR_FAILED)));
            }
            String filePath = directoryFilePath + "/" + fileName;
            Boolean uploaded = file.getFile().renameTo(new File(filePath));
            if (!uploaded) {
                LogUtil.errorLog("Saving file failed", uuid);
                return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.SAVE_FILE_FAILED)));
            }
            sampleFile = new SampleFile(token, fileName, uniqueFileName, directoryFilePath);
            sampleFile.save();
            sampleFile.setSampleSize(Software.byName(softwareTypeName));
            if (token.getMaxClonotypesCount() > 0) {
                if (sampleFile.getSampleSize() > token.getMaxClonotypesCount()) {
                    sampleFile.deleteFile();
                    return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.MAX_CLONOTYPES_COUNT_REACHED)));
                }
            }
        } catch (Exception e) {
            if (sampleFile != null) {
                sampleFile.deleteFile();
            }
            LogUtil.warnLog("Error while rendering sample file " + fileName, uuid);
            return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.ERROR_WHILE_RENDERING_SAMPLE_FILE)));
        }

        return ok(Json.toJson(new SuccessResponse("Successfully uploaded")));
    }

    public static Result delete() {
        Token token = Application.authtorize();
        String uuid = token.getUuid();

        JsonNode request = request().body().asJson();
        String action = request.findValue("action").asText();

        if (action == null) {
            return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.INVALID_REQUEST)));
        }

        switch (action) {
            case "delete":
                String fileName = request.findValue("fileName").asText();
                SampleFile file = token.findFileByName(fileName);
                if (file == null) {
                    return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.FILE_DOES_NOT_EXIST)));
                }
                file.deleteFile();
                return ok(Json.toJson(new SuccessResponse("Successfully deleted")));
            case "deleteAll":
                for (SampleFile userFile : token.getFiles()) {
                    userFile.deleteFile();
                }
                return ok(Json.toJson(new SuccessResponse("Successfully deleted")));
            default:
                return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.INVALID_REQUEST)));
        }
    }

    public static F.Promise<Result> data() {
        return F.Promise.promise(new F.Function0<Result>() {
            @Override
            public Result apply() throws Throwable {
                Token user = Application.authtorize();

                if (user == null) {
                    return badRequest(Json.toJson(ServerErrorCode.INVALID_COOKIE));
                }
                JsonNode request = request().body().asJson();
                if (!request.has("fileName") || !request.has("parameters") || !request.has("type")) {
                    return badRequest(Json.toJson(ServerErrorCode.INVALID_REQUEST));
                }
                String fileName = request.get("fileName").asText();
                RequestTreeSearchParameters parameters;
                try {
                    ObjectMapper objectMapper = new ObjectMapper();
                    parameters = objectMapper.convertValue(request.get("parameters"), RequestTreeSearchParameters.class);
                } catch (Exception e) {
                    e.printStackTrace();
                    return badRequest(Json.toJson(ServerErrorCode.INVALID_REQUEST));
                }

                SampleFile sampleFile = user.findFileByName(fileName);
                if (sampleFile == null) {
                    return badRequest(Json.toJson(ServerErrorCode.INVALID_FILE_NAME));
                }

                switch (request.get("type").asText()) {
                    case "annotations":
                        CachedAnnotations cachedAnnotations = CachedAnnotations.cached(sampleFile, parameters);
                        return ok(Json.toJson(cachedAnnotations));
                    case "sunburst":
                        CachedSunburst cachedSunburst = CachedSunburst.cached(sampleFile, parameters);
                        return ok(Json.toJson(cachedSunburst));
                    case "countpie":
                        CachedCountPiechart cachedCountPiechart = CachedCountPiechart.cached(sampleFile, parameters);
                        return ok(Json.toJson(cachedCountPiechart));
                    default:
                        return badRequest(Json.toJson(ServerErrorCode.INVALID_REQUEST));
                }

            }
        });
    }
}
