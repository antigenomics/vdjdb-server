package models.file;

import com.antigenomics.vdjtools.misc.Software;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.annotation.JsonIgnore;
import models.auth.User;
import org.apache.commons.io.FileDeleteStrategy;
import org.joda.time.DateTime;
import play.db.ebean.Model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import java.io.File;


@Entity
public class ServerFile extends Model {
    @Id
    @JsonIgnore
    protected Long id;

    @ManyToOne
    @JsonIgnore
    protected User user;

    protected String fileName;

    @JsonIgnore
    protected String uniqueName;

    protected DateTime createdAt;

    @JsonIgnore
    protected String directoryPath;

    @JsonIgnore
    protected String filePath;

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

    public static void deleteFile(ServerFile file) {
        File fileDir = new File(file.directoryPath);
        if (!fileDir.exists()) {
            Ebean.delete(file);
            return;
        }
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

}
