package models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import models.auth.User;
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

    @JsonIgnore
    private String uniqueName;

    private DateTime createdAt;

    @JsonIgnore
    private String directoryPath;

    @JsonIgnore
    private String filePath;

    public ServerFile(User user, String fileName, String uniqueName, String directoryPath, String filePath) {
        this.user = user;
        this.fileName = fileName;
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

}
