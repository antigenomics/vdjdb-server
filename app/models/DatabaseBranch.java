package models;

import com.antigenomics.vdjtools.misc.Software;
import com.fasterxml.jackson.annotation.JsonIgnore;
import models.auth.User;
import org.joda.time.DateTime;
import play.db.ebean.Model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToOne;

/**
 * Created by bvdmitri on 23.03.16.
 */

@Entity
public class DatabaseBranch extends Model {

    @Id
    @JsonIgnore
    private Long id;

    @ManyToOne
    @JsonIgnore
    private User user;

    private String branchName;
    private Boolean merged = false;
    private Boolean rejected = false;

    private DateTime createdAt;

    @JsonIgnore
    private String directoryPath;

    public static DatabaseBranch fyndByNameAndUser(User user, String branchName) {
        return find().where().eq("user", user).eq("branchName", branchName).findUnique();
    }

    public static Model.Finder<Long, DatabaseBranch> find() {
        return new Model.Finder<>(Long.class, DatabaseBranch.class);
    }
}
