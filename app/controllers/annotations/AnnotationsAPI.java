package controllers.annotations;

import com.antigenomics.vdjtools.Software;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.Application;
import graph.Annotations.AnnotationGenerator;
import models.SampleFile;
import models.Token;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Result;
import scala.App;
import utils.CommonUtil;
import utils.Configuration;
import utils.LogUtil;
import utils.ServerResponse.ErrorResponse;
import utils.ServerResponse.ServerErrorCode;
import utils.ServerResponse.SuccessResponse;

import java.io.File;

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

        String fileName;
        if (body.asFormUrlEncoded().containsKey("fileName")) {
            fileName = body.asFormUrlEncoded().get("fileName")[0];
        } else {
            fileName = file.getFilename();
        }

        String pattern = "^[a-zA-Z0-9_.-]{1,40}$";
        if (fileName == null || !fileName.matches(pattern)) {
            return badRequest(Json.toJson(new ErrorResponse("Invalid file name", ServerErrorCode.INVALID_FILE_NAME)));
        }


        for (SampleFile sampleFile : token.getFiles()) {
            if (sampleFile.getFileName().equals(fileName)) {
                return badRequest(Json.toJson(new ErrorResponse("You should use unique names for your files", ServerErrorCode.FILE_NOT_UNIQUE_NAME)));
            }
        }

        //TODO MAX files count and max file size
        SampleFile sampleFile = null;
        try {
            if (!body.asFormUrlEncoded().containsKey("softwareTypeName")) {
                LogUtil.warnLog("Invalid file upload form", uuid);
                return badRequest(Json.toJson(new ErrorResponse("Invalid form", ServerErrorCode.INVALID_FILE_UPLOAD_FORM)));
            }
            String softwareTypeName = body.asFormUrlEncoded().get("softwareTypeName")[0];
            String uniqueFileName = CommonUtil.RandomStringGenerator.generateRandomString(20, CommonUtil.RandomStringGenerator.Mode.ALPHANUMERIC);
            //TODO
            String directoryFilePath = Configuration.uploadDirectory + "/" + uniqueFileName + "/";
            File fileDirectory = new File(directoryFilePath);
            if (!fileDirectory.mkdir()) {
                LogUtil.errorLog("Making directory is failed", uuid);
                return badRequest(Json.toJson(new ErrorResponse("Server is unavailable", ServerErrorCode.MKDIR_FAILED)));
            }
            String filePath = directoryFilePath + "/" + fileName;
            Boolean uploaded = file.getFile().renameTo(new File(filePath));
            if (!uploaded) {
                LogUtil.errorLog("Saving file failed", uuid);
                return badRequest(Json.toJson(new ErrorResponse("Saving file failed", ServerErrorCode.SAVE_FILE_FAILED)));
            }
            sampleFile = new SampleFile(token, fileName, uniqueFileName, directoryFilePath);
            sampleFile.save();
            sampleFile.setSampleSize(Software.byName(softwareTypeName));
            //TODO
            /*
            if (Configuration.getMaxClonotypesCount() > 0) {
                if (sampleFile.getSampleSize() > Configuration.getMaxClonotypesCount()) {
                    sampleFile.deleteFile();
                    return ok(Json.toJson(new ServerResponse("error", "Number of clonotypes should be less than " + Configuration.getMaxClonotypesCount())));
                }
            }
            */
        } catch (Exception ignored) {
            if (sampleFile != null) {
                sampleFile.deleteFile();
            }
            LogUtil.warnLog("Error while rendering sample file " + fileName, uuid);
            return badRequest(Json.toJson(new ErrorResponse("Error while rendering", ServerErrorCode.ERROR_WHILE_RENDERING_SAMPLE_FILE)));
        }

        return ok(Json.toJson(new SuccessResponse("Successfully uploaded")));
    }

    public static Result delete() {
        Token token = Application.authtorize();
        String uuid = token.getUuid();

        JsonNode request = request().body().asJson();
        String action = request.findValue("action").asText();

        if (action == null) {
            return badRequest(Json.toJson(new ErrorResponse("Invalid request", ServerErrorCode.INVALID_REQUEST)));
        }

        switch (action) {
            case "delete":
                String fileName = request.findValue("fileName").asText();
                SampleFile file = token.findFileByName(fileName);
                if (file == null) {
                    return badRequest(Json.toJson(new ErrorResponse("You have no file named " + fileName, ServerErrorCode.INVALID_FILE_NAME)));
                }
                file.deleteFile();
                return ok(Json.toJson(new SuccessResponse("Successfully deleted")));
            case "deleteAll":
                for (SampleFile userFile : token.getFiles()) {
                    userFile.deleteFile();
                }
                return ok(Json.toJson(new SuccessResponse("Successfully deleted")));
            default:
                return badRequest(Json.toJson(new ErrorResponse("Invalid request", ServerErrorCode.INVALID_REQUEST)));
        }
    }

    public static Result getData() {
        Token user = Application.authtorize();

        if (user == null) {
            return badRequest(Json.toJson(new ErrorResponse("Invalid Cookie", ServerErrorCode.INVALID_COOKIE)));
        }
        JsonNode request = request().body().asJson();
        if (!request.has("fileName") || !request.has("parameters")) {
            return badRequest(Json.toJson(new ErrorResponse("Invalid request", ServerErrorCode.INVALID_REQUEST)));
        }
        String fileName = request.findValue("fileName").asText();
        SampleFile file = user.findFileByName(fileName);
        if (file == null) {
            return badRequest(Json.toJson(new ErrorResponse("You have no file named " + fileName, ServerErrorCode.INVALID_FILE_NAME)));
        }
        return ok(Json.toJson(AnnotationGenerator.getCachedData(request, file)));
    }

}
