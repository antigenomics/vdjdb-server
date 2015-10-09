package models;

import org.joda.time.DateTime;
import play.data.validation.Constraints;
import play.db.ebean.Model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToMany;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
public class Token extends Model {
    public static final Model.Finder<String, Token> finder = new Model.Finder<>(String.class, Token.class);
    @Id
    @Column(length = 36)
    @Constraints.Required
    private String uuid;
    private boolean temp;
    private DateTime lastUsage;
    private DateTime createdAt;
    @ManyToMany
    private List<IPAddress> ipAddressList;

    public Token(boolean temp) {
        this.temp = temp;
        this.uuid = UUID.randomUUID().toString();
        this.lastUsage = new DateTime();
        this.createdAt = this.lastUsage;
        this.ipAddressList = new ArrayList<>();
    }

    public static Token findByUUID(String uuid) {
        return finder.where().eq("uuid", uuid).findUnique();
    }

    public void addIpAddress(IPAddress ipAddress) {
        ipAddressList.add(ipAddress);
        this.update();
    }

    public void updateLastUsage() {
        this.lastUsage = new DateTime();
        this.update();
    }

    public String getUuid() {
        return uuid;
    }

    public boolean isTemp() {
        return temp;
    }

    public DateTime getLastUsage() {
        return lastUsage;
    }

    public DateTime getCreatedAt() {
        return createdAt;
    }

    public List<IPAddress> getIpAddressList() {
        return ipAddressList;
    }
}
