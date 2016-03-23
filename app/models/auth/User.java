package models.auth;


import com.fasterxml.jackson.annotation.JsonIgnore;
import models.DatabaseBranch;
import models.ServerFile;
import play.db.ebean.Model;
import server.Configuration;
import utils.CommonUtils;
import server.ServerLogger;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 10.02.16.
 */

@Entity
public class User extends Model {
    @Id
    @JsonIgnore
    private String uuid;
    @JsonIgnore
    private String provider;
    private String email;
    @JsonIgnore
    private String password;
    @JsonIgnore
    private String directoryPath;
    private Integer maxFilesCount;
    private Integer maxFilesSize;

    @OneToMany(mappedBy = "user")
    private List<ServerFile> files;

    @OneToMany(mappedBy = "user")
    private List<DatabaseBranch> branches;

    public User(String uuid, String provider, String email, String password) {
        this.uuid = uuid;
        this.provider = provider;
        this.email = email;
        this.password = password;
        this.directoryPath = Configuration.uploadPath() + "/" + email + "/";
        this.maxFilesCount = Configuration.maxFilesCount();
        this.maxFilesSize = Configuration.maxFilesCount();
        this.files = new ArrayList<>();
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

    public String getDirectoryPath() {
        return directoryPath;
    }

    public Integer getMaxFilesCount() {
        return maxFilesCount;
    }

    public Integer getMaxFilesSize() {
        return maxFilesSize;
    }

    public  List<ServerFile> getFiles() {
        return files;
    }

    public List<DatabaseBranch> getBranches() { return branches; }

    public Boolean isMaxFilesCountExceeded() {
        return maxFilesCount > 0 && files.size() >= maxFilesCount;
    }

    public Boolean isMaxFileSizeExceeded(Long size) {
        return maxFilesSize > 0 && size > maxFilesSize;
    }

    public Boolean isNameUnique(String fileName) {
        for (ServerFile file : files) {
            if (file.getFileName().equals(fileName)) return false;
        }
        return true;
    }

    public Boolean isUserDirectoryExists() {
        File userDirectory = new File(directoryPath);
        if (!userDirectory.exists()) {
            Boolean created = userDirectory.mkdir();
            if (!created) {
                logError("Error while creating user directory");
                return false;
            }
        }
        return true;
    }

    public synchronized void saveUser() {
        File userDir = new File(directoryPath);
        if (!userDir.exists()) {
            Boolean created = userDir.mkdir();
            if (!created) {
                //TODO logger
                throw new RuntimeException("Error while creating directory");
            }
        }
        save();
    }

    public void logInfo(String message) {
        ServerLogger.userInfo(this, message);
    }

    public void logError(String message) {
        ServerLogger.userError(this, message);
    }

    static public synchronized Model.Finder<String, User> find() {
        return new Model.Finder<>(String.class, User.class);
    }

    static public synchronized User findByUUID(String uuid) {
        return find().where().eq("uuid", uuid).findUnique();
    }

}

