package controllers.annotations;

import controllers.Application;
import models.Token;
import play.mvc.Controller;
import play.mvc.Result;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class AnnotationsPages extends Controller {
    public static Result annotationsUploadFilesPage() {
        Token token = Application.authtorize();
        return ok(views.html.sampleResults.upload.render());
    }

    public static Result annotationsMainPage() {
        Token token = Application.authtorize();
        return ok(views.html.sampleResults.main.render());
    }
}
