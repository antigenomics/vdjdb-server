package controllers;

import models.IPAddress;
import models.Token;
import play.mvc.*;

import views.html.*;

import java.util.List;

public class Application extends Controller {

    public static Result index() {
        return ok(index.render("Your new application is ready."));
    }

    public static Result generateToken() {
        String tempParameter = request().getQueryString("temp");
        String ip = request().remoteAddress();
        Token token = Token.generateNewToken(tempParameter);
        IPAddress ipAddress = IPAddress.findByIP(ip);
        if (ipAddress == null) {
            ipAddress = new IPAddress(ip);
            ipAddress.save();
        }
        ipAddress.addToken(token);
        token.addIpAddress(ipAddress);
        return ok(token.getUuid());
    }

    public static Result searchPage() {
        Token token = authtorize();
        return ok(search.render(token.getUuid()));
    }

    public static Result tokenTest(String tokenUUID) {
        Token token = Token.findByUUID(tokenUUID);
        if (token != null) {
            List<IPAddress> ipAddressList = token.getIpAddressList();
            for (IPAddress ipAddress : ipAddressList) {
                System.out.println(ipAddress);
            }
            return ok(token.getIpAddressList().toString());
        }
        return ok("not found");
    }

    public static Token authtorize() {
        if (!session().containsKey("token")) {
            Token newToken = Token.generateNewToken(true);
            session().put("token", newToken.getUuid());
            return newToken;
        }
        Token token = Token.findByUUID(session().get("token"));
        if (token == null) {
            session().clear();
            return authtorize();
        }
        return token;
    }

}
