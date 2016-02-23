package models.auth;


import play.db.ebean.Model;

import javax.persistence.Entity;
import javax.persistence.Id;

/**
 * Created by bvdmitri on 10.02.16.
 */

@Entity
public class User extends Model {
    @Id
    private String uuid;
    private String provider;
    private String email;
    private String password;

    public User(String uuid, String provider, String email, String password) {
        this.uuid = uuid;
        this.provider = provider;
        this.email = email;
        this.password = password;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getUuid() {
        return uuid;
    }

    public String getProvider() {
        return provider;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    static public Model.Finder<String, User> find() {
        return new Model.Finder<>(String.class, User.class);
    }

    static public User findByUUID(String uuid) {
        return find().where().eq("uuid", uuid).findUnique();
    }

}

