package models.file;

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
public class BranchFile extends ServerFile {

    private String branchName;
    private Boolean merged = false;
    private Boolean rejected = false;

    public BranchFile(User user, String fileName, String uniqueName, String directoryPath, String filePath, String branchName) {
        super(user, fileName, uniqueName, directoryPath, filePath);
        this.branchName = branchName;
    }

    public String getBranchName() {
        return branchName;
    }

    public Boolean isMerged() {
        return merged;
    }

    public Boolean isRejected() {
        return rejected;
    }
}
