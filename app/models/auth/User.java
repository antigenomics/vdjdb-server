package models.auth;


import com.fasterxml.jackson.annotation.JsonIgnore;
import models.file.BranchFile;
import models.file.IntersectionFile;
import models.file.ServerFile;
import play.db.ebean.Model;
import server.Configuration;
import server.ServerLogger;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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
    private Integer maxFileSize;
    @JsonIgnore
    private Boolean privelegies = false;

    @OneToMany(mappedBy = "user")
    private List<IntersectionFile> files;

    @OneToMany(mappedBy = "user")
    private List<BranchFile> branches;

    public User(String uuid, String provider, String email, String password) {
        this.uuid = uuid;
        this.provider = provider;
        this.email = email;
        this.password = password;
        this.directoryPath = Configuration.uploadPath() + "/" + email + "/";
        this.maxFilesCount = Configuration.maxFilesCount();
        this.maxFileSize = Configuration.maxFileSize();
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
        return privelegies ? 0 : maxFilesCount;
    }

    public Integer getMaxFileSize() {
        return privelegies ? 0 : maxFileSize;
    }

    public  List<IntersectionFile> getFiles() {
        return files;
    }

    public List<BranchFile> getBranches() { return branches; }

    public Boolean isMaxFilesCountExceeded() {
        return maxFilesCount > 0 && files.size() >= maxFilesCount;
    }

    public Boolean isMaxFileSizeExceeded(Long size) {
        return maxFileSize > 0 && size > maxFileSize;
    }

    public Boolean isIntersectionFileNameUnique(String fileName) {
        for (ServerFile file : files) {
            if (file.getFileName().equals(fileName)) return false;
        }
        return true;
    }

    public Boolean isBranchNameUnique(String branchName) {
        for (BranchFile file: branches) {
            if (file.getBranchName().equals(branchName)) return false;
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

    public Boolean isDemoUser() {
        return Objects.equals(uuid, "demo");
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

    static public synchronized Boolean isUserExistByUUID(String uuid) {
        return findByUUID(uuid) != null;
    }

    static public synchronized Boolean isUserExistByEmail(String email) {
        return findByEmail(email) != null;
    }

    static public synchronized User findByUUID(String uuid) {
        return find().where().eq("uuid", uuid).findUnique();
    }

    static public synchronized User findByEmail(String email) {
        return find().where().eq("email", email).findUnique();
    }

}

