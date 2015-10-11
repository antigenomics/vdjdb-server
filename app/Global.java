import models.IPAddress;
import play.Application;
import play.GlobalSettings;
import play.Logger;
import play.api.mvc.EssentialFilter;
import play.libs.F;
import play.mvc.Action;
import play.mvc.Http;
import play.filters.gzip.GzipFilter;
import play.mvc.SimpleResult;

import java.lang.reflect.Method;

public class Global extends GlobalSettings {

    public <T extends EssentialFilter> Class<T>[] filters() {
        return new Class[]{GzipFilter.class};
    }

    @Override
    public Action onRequest(Http.Request request, Method method) {
        String ip = request.remoteAddress();
        IPAddress ipAddress = IPAddress.findByIP(ip);
        if (ipAddress == null) {
            ipAddress = new IPAddress(ip);
            ipAddress.save();
        } else {
            if (ipAddress.isBanned()) {
                return new Action.Simple() {
                    @Override
                    public F.Promise<SimpleResult> call(Http.Context ctx) throws Throwable {
                        return F.Promise.pure((SimpleResult) status(0));
                    }
                };
            }
        }
        //ipAddress.login();
        return super.onRequest(request, method);
    }

    @Override
    public F.Promise<SimpleResult> onHandlerNotFound(Http.RequestHeader requestHeader) {
        return super.onHandlerNotFound(requestHeader);
    }

    public void onStart(Application app) {
        Logger.info("Application started");
    }

    public void onStop(Application app) {
        Logger.info("Application stopped");
    }


}
