package models;

import org.apache.commons.io.FilenameUtils;
import org.joda.time.DateTime;
import play.data.validation.Constraints;
import play.db.ebean.Model;
import utils.Configuration;

import javax.persistence.*;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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
    private int maxFileSize;
    private int maxFilesCount;
    private int maxClonotypesCount;
    private String uploadDirectory;
    @OneToMany(mappedBy="token")
    private List<SampleFile> files;

    public Token(boolean temp) {
        this.temp = temp;
        this.uuid = UUID.randomUUID().toString();
        this.lastUsage = new DateTime();
        this.createdAt = this.lastUsage;
        this.ipAddressList = new ArrayList<>();
        this.uploadDirectory = Configuration.uploadDirectory + "/" + uuid + "/";
        this.maxFileSize = Configuration.maxFileSize;
        this.maxFilesCount = Configuration.maxFilesCount;
        this.maxClonotypesCount = Configuration.maxClonotypesCount;
    }


    //TODO
    public static class TokenInformation {
        public List<String> fileNames;
        public Integer maxFilesCount;
        public Integer maxFileSize;

        public TokenInformation(Token token) {
            this.fileNames = token.getFileNames();
            this.maxFilesCount = token.maxFilesCount;
            this.maxFileSize = token.maxFileSize;
        }
    }

    public static Token generateDebugToken() {
        Token debugToken = Token.findByUUID(Configuration.debugToken);
        if (debugToken == null) {
            debugToken = new Token(false);
            debugToken.setUuid(Configuration.debugToken);
            debugToken.save();
        }
        return debugToken;
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

    public SampleFile findFilebyNameWithoutExtension(String fileName) {
        for (SampleFile file : files) {
            if (Objects.equals(FilenameUtils.removeExtension(file.getFileName()), fileName)) {
                return file;
            }
        }
        return null;
    }

    public SampleFile findFileByName(String fileName) {
        for (SampleFile file : files) {
            if (Objects.equals(file.getFileName(), fileName)) {
                return file;
            }
        }
        return null;
    }

    public Boolean isMaxFilesCountExceeded() {
        if (getMaxFilesCount() > 0) {
            if (getFilesCount() > getMaxFilesCount()) {
                return true;
            }
        }
        return false;
    }

    public int getFilesCount() {
        return files.size();
    }

    public static Token generateNewToken(String tempParameter) {
        boolean temp;
        if (tempParameter == null) {
            temp = false;
        } else {
            try {
                temp = Boolean.valueOf(tempParameter);
            } catch (Exception ignored) {
                temp = true;
            }
        }
        return generateNewToken(temp);
    }

    public static Token generateNewToken(Boolean temp) {
        Token token = new Token(temp);
        token.createDirectory();
        token.save();
        return token;
    }

    private void createDirectory() {
        File directory = new File(uploadDirectory);
        directory.mkdir();
    }

    public List<SampleFile> getFiles() {
        return files;
    }

    public List<String> getFileNames() {
        List<String> fileNames = new ArrayList<>();
        for (SampleFile file : files) {
            fileNames.add(file.getFileName());
        }
        return fileNames;
    }

    public String getUploadDirectory() {
        return uploadDirectory;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public int getMaxFileSize() {
        return maxFileSize;
    }

    public int getMaxFilesCount() {
        return maxFilesCount;
    }

    public int getMaxClonotypesCount() {
        return maxClonotypesCount;
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
