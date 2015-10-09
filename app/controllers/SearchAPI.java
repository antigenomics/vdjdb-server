package controllers;

import com.antigenomics.vdjdb.DatabaseSearcher;
import com.antigenomics.vdjdb.filters.Filter;
import com.antigenomics.vdjdb.filters.FuzzyFilter;
import com.antigenomics.vdjdb.filters.MatchFilter;
import com.antigenomics.vdjdb.filters.PatternFilter;
import com.antigenomics.vdjdb.models.CdrEntrySetDB;
import com.antigenomics.vdjdb.models.EntryDB;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.IPAddress;
import models.Token;
import play.libs.F;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;
import utils.LogUtil;
import utils.ServerErrors.ErrorResponse;
import utils.ServerErrors.ServerErrorCode;

import java.util.ArrayList;
import java.util.List;

public class SearchAPI extends Controller {
    private static final String API_VERSION = "v1";
    private static final String DB_NAME = "vdjdb";
    private static final String DB_USER_NAME = "postgres";
    private static final String DB_USER_PASSWORD = "postgres";



    public static class SearchFilter {
        public String type;
        public String field;
        public String value;
        public boolean match;
        public int distance;
    }

    public static class SearchParameters {
        public String token;
        public List<SearchFilter> filters;
    }

    public static class SearchResponse {

    }

    private static Filter convertFilter(SearchFilter searchFilter) {
        switch (searchFilter.type) {
            case "match":
                return new MatchFilter(searchFilter.field, searchFilter.value, searchFilter.match);
            case "pattern":
                return new PatternFilter(searchFilter.field, searchFilter.value, searchFilter.match);
            case "fuzzy":
                return new FuzzyFilter(searchFilter.field, searchFilter.value, searchFilter.distance);
        }
        System.out.println("Filter " + searchFilter.type + " skipped");
        return null;
    }

    private static List<Filter> convertFilters(List<SearchFilter> searchFilters) {
        List<Filter> filters = new ArrayList<>();
        if (searchFilters != null) {
            for (SearchFilter searchFilter : searchFilters) {
                Filter filter = convertFilter(searchFilter);
                if (filter != null)
                    filters.add(filter);
            }
        }
        return filters;
    }

    public static F.Promise<Result> search() {
        return F.Promise.promise(new F.Function0<Result>() {
            @Override
            public Result apply() throws Throwable {
                JsonNode request = request().body().asJson();
                SearchParameters searchParameters;
                try {
                    ObjectMapper objectMapper = new ObjectMapper();
                    searchParameters = objectMapper.convertValue(request, SearchParameters.class);
                    if (searchParameters == null) {
                        throw new NullPointerException();
                    }
                } catch (Exception ignored) {
                    LogUtil.log("Bad request: " + request, LogUtil.LogType.WARN);
                    return badRequest(Json.toJson(new ErrorResponse("Bad request: " + request, ServerErrorCode.INVALID_SEARCH_PARAMETERS)));
                }

                if (searchParameters.token == null) {
                    LogUtil.log("Unauthorized access: null token from " + request().remoteAddress(), LogUtil.LogType.WARN);
                    return badRequest(Json.toJson(new ErrorResponse("Unauthorized access: null token", ServerErrorCode.NULL_TOKEN)));
                }

                Token token = Token.findByUUID(searchParameters.token);
                if (token == null) {
                    LogUtil.log("Unauthorized access: bad token " + searchParameters.token + " from " + request().remoteAddress(), LogUtil.LogType.WARN);
                    return badRequest(Json.toJson(new ErrorResponse("Unauthorized access: bad token", ServerErrorCode.BAD_TOKEN)));
                }
                token.updateLastUsage();

                List<Filter> filters = convertFilters(searchParameters.filters);
                DatabaseSearcher databaseSearcher;
                List<CdrEntrySetDB> searchResults;

                try {
                    databaseSearcher = new DatabaseSearcher(DB_NAME, DB_USER_NAME, DB_USER_PASSWORD);
                    databaseSearcher.open();
                    searchResults = databaseSearcher.search(filters);
                    databaseSearcher.close();
                } catch (Exception e) {
                    LogUtil.log("Search error for token " + token.getUuid() + "\nFilters used: " + filters.toString(), LogUtil.LogType.ERROR);
                    e.printStackTrace();
                    return badRequest(Json.toJson(new ErrorResponse("Search error", ServerErrorCode.SEARCH_ERROR)));
                }
                for (CdrEntrySetDB searchResult : searchResults) {
                    for (EntryDB entryDB : searchResult.getCdrEntries()) {
                        entryDB.setParent(null);
                    }
                }
                return ok(Json.toJson(searchResults));
            }
        });
    }

}
