package models;

import org.joda.time.DateTime;
import play.data.validation.Constraints;
import play.db.ebean.Model;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToMany;
import java.util.ArrayList;
import java.util.List;

@Entity
public class IPAddress extends Model {
    public static final Model.Finder<Long, IPAddress> finder = new Model.Finder<>(Long.class, IPAddress.class);

    @Id
    private Long id;
    @Constraints.Required
    private String ip;
    @ManyToMany(cascade = CascadeType.ALL)
    private List<Token> tokenList;
    private DateTime lastLogin;
    private int warnLevel = 0;
    private boolean banned = false;

    public IPAddress(String ip) {
        this.ip = ip;
        this.lastLogin = new DateTime();
        this.tokenList = new ArrayList<>();
    }

    public void addToken(Token token) {
        tokenList.add(token);
        this.update();
    }

    public static IPAddress findByIP(String ip) {
        List<IPAddress> ipList = finder.where().eq("ip", ip).findList();
        if (ipList.size() == 0) return null;
        return ipList.get(0);
    }

    public String getIP() {
        return ip;
    }

    public List<Token> getTokenList() {
        return tokenList;
    }

    public DateTime getLastLogin() {
        return lastLogin;
    }

    public void ban() {
        banned = true;
        this.update();
    }

    public void login() {
        lastLogin = new DateTime();
        this.update();
    }

    public boolean isBanned() {
        return banned;
    }

    @Override
    public String toString() {
        return "IPAddress{" +
                "id=" + id +
                ", ip='" + ip + '\'' +
                ", tokenList=" + tokenList +
                ", lastLogin=" + lastLogin +
                '}';
    }
}
