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
        boolean temp;
        if (tempParameter == null) {
            temp = false;
        } else {
            try {
                temp = Boolean.valueOf(tempParameter);
            } catch (Exception ignored) {
                temp = true;
            }
        }
        Token token = new Token(temp);
        token.save();
        IPAddress ipAddress = IPAddress.findByIP(ip);
        if (ipAddress == null) {
            ipAddress = new IPAddress(ip);
            ipAddress.save();
        }
        ipAddress.addToken(token);
        token.addIpAddress(ipAddress);
        return ok(token.getUuid());
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

}
