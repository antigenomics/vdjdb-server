package models;

import com.antigenomics.vdjtools.sample.SampleCollection;
import com.avaje.ebean.Ebean;
import org.joda.time.DateTime;
import play.db.ebean.Model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import com.antigenomics.vdjtools.Software;

@Entity
public class SampleFile extends Model {
    @Id
    private Long id;
    @OneToOne
    private Token token;
    private String fileName;
    private String shareLink;
    private Boolean shared;
    private String uniqueName;
    private DateTime createdAt;
    private DateTime lastUsage;
    private Integer sampleSize;
    private Software softwareType;
    private String directoryPath;
    private String filePath;

    public SampleFile(Token token, String fileName, String uniqueName, String directoryPath) {
        this.token = token;
        this.fileName = fileName;
        this.uniqueName = uniqueName;
        this.directoryPath = directoryPath;
        this.shared = false;
        this.createdAt = new DateTime();
        this.lastUsage = new DateTime();
        this.filePath = directoryPath + "/" + fileName;
    }

    public void setSampleSize(Software softwareType) {
        //TODO
        this.softwareType = softwareType;
        List<String> sampleFileNames = new ArrayList<>();
        sampleFileNames.add(filePath);
        SampleCollection sampleCollection = new SampleCollection(sampleFileNames, softwareType, false);
        this.sampleSize = sampleCollection.getAt(0).getDiversity();
        Ebean.update(this);
    }

    public Token getToken() {
        return token;
    }

    public Integer getSampleSize() {
        return sampleSize;
    }

    public void deleteFile() {
        SampleFile f = find().where().eq("id", this.id).findUnique();
        File fileDir = new File(directoryPath);
        File[] files = fileDir.listFiles();
        if (files != null) {
            for (File cache : files) {
                try {
                    Files.deleteIfExists(cache.toPath());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
        fileDir.delete();
        Ebean.delete(f);
    }

    public Boolean isShared() {
        return shared;
    }

    public Software getSoftwareType() {
        return softwareType;
    }

    public String getDirectoryPath() {
        return directoryPath;
    }

    public DateTime getCreatedAt() {
        return createdAt;
    }

    public static List<SampleFile> findByToken(String token) {
        return find().where().eq("token", token).findList();
    }

    public String getFilePath() {
        return filePath;
    }

    public String getFileName() {
        return fileName;
    }

    public static Model.Finder<Long, SampleFile> find() {
        return new Model.Finder<>(Long.class, SampleFile.class);
    }
}
