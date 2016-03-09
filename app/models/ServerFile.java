package models;

import com.antigenomics.vdjtools.misc.Software;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.annotation.JsonIgnore;
import models.auth.User;
import org.apache.commons.io.FileDeleteStrategy;
import org.joda.time.DateTime;
import play.db.ebean.Model;
import utils.CommonUtils;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import java.io.File;

@Entity
public class ServerFile extends Model {
    @Id
    @JsonIgnore
    private Long id;

    @ManyToOne
    @JsonIgnore
    private User user;

    private String fileName;
    private Software software;

    @JsonIgnore
    private String uniqueName;

    private DateTime createdAt;

    @JsonIgnore
    private String directoryPath;

    @JsonIgnore
    private String filePath;

    public ServerFile(User user, String fileName, Software software, String uniqueName, String directoryPath, String filePath) {
        this.user = user;
        this.fileName = fileName;
        this.software = software;
        this.uniqueName = uniqueName;
        this.createdAt = new DateTime();
        this.directoryPath = directoryPath;
        this.filePath = filePath;
    }

    public User getUser() {
        return user;
    }

    public String getFileName() {
        return fileName;
    }

    public Software getSoftware() {
        return software;
    }

    public String getUniqueName() {
        return uniqueName;
    }

    public DateTime getCreatedAt() {
        return createdAt;
    }

    public String getDirectoryPath() {
        return directoryPath;
    }

    public String getFilePath() {
        return filePath;
    }

    public static void deleteFile(ServerFile file) {
        File fileDir = new File(file.directoryPath);
        File[] files = fileDir.listFiles();
        if (files == null) {
            fileDir.delete();
            Ebean.delete(file);
            return;
        }
        for (File cache : files) {
            try {
                FileDeleteStrategy.FORCE.delete(cache);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        fileDir.delete();
        Ebean.delete(file);
    }

    public static ServerFile fyndByNameAndUser(User user, String fileName) {
        return find().where().eq("user", user).eq("fileName", fileName).findUnique();
    }

    public static Model.Finder<Long, ServerFile> find() {
        return new Model.Finder<>(Long.class, ServerFile.class);
    }

}
