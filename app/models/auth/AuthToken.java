package models.auth;


import org.joda.time.DateTime;
import play.db.ebean.Model;
import securesocial.core.providers.Token;

import javax.persistence.Entity;
import javax.persistence.Id;
import java.text.ParseException;
import java.text.SimpleDateFormat;

/**
 * Created by bvdmitri on 10.02.16.
 */


@Entity
public class AuthToken extends Model {
    @Id
    private String uuid;
    private String email;
    private DateTime createdAt;
    private DateTime expiredAt;
    private Boolean signUp;

    public AuthToken(String uuid, String email, DateTime createdAt, DateTime expiredAt, Boolean signUp) {
        this.uuid = uuid;
        this.email = email;
        this.createdAt = createdAt;
        this.expiredAt = expiredAt;
        this.signUp = signUp;
    }

    public AuthToken(Token token) {
        this.uuid = token.uuid();
        this.email = token.email();
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        try {
            this.createdAt = new DateTime(simpleDateFormat.parse(token.creationTime().toString("yyyy-MM-dd HH:mm:ss")));
            this.expiredAt = new DateTime(simpleDateFormat.parse(token.expirationTime().toString("yyyy-MM-dd HH:mm:ss")));
        } catch (ParseException e) {
            e.printStackTrace();
        }
        this.signUp = token.isSignUp();

    }

    public String getEmail() {
        return email;
    }

    public String getUuid() {
        return uuid;
    }

    public DateTime getCreatedAt() {
        return createdAt;
    }

    public DateTime getExpiredAt() {
        return expiredAt;
    }

    public Boolean isSignUp() {
        return signUp;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setCreatedAt(DateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setExpiredAt(DateTime expiredAt) {
        this.expiredAt = expiredAt;
    }

    public void setSignUp(Boolean signUp) {
        this.signUp = signUp;
    }

    public static Model.Finder<String, AuthToken> find() {
        return new Model.Finder<>(String.class, AuthToken.class);
    }

    public static AuthToken findByUUID(String uuid) {
        return find().where().eq("uuid", uuid).findUnique();
    }
}
