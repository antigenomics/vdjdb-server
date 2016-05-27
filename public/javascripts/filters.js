(function() {
    var application = angular.module('filters', []);

    application.factory('filters', ['$http', 'notify', function ($http, notify) {
        var textFilters = [];
        var sequenceFilters = [];
        var textFilterIndex = 0;
        var sequenceFilterIndex = 0;

        var loading = true;
        var error = false;

        var textFiltersColumns = [];
        var sequenceFiltersColumns = [];

        var textFiltersTypes = Object.freeze([
            { name: 'substring', title: 'Substring', allowNegative: true},
            { name: 'exact', title: 'Exact', allowNegative: true},
            { name: 'pattern', title: 'Pattern', allowNegative: true},
            { name: 'level', title: 'Level', allowNegative: false}
        ]);

        $http.get('/search/columns')
            .success(function(columnsInfo) {
                var columns = columnsInfo.columns;
                angular.forEach(columns, function(columnInfo) {
                    var column = columnInfo.column;
                    if (column.metadata.searchable == 1) {
                        if (column.metadata.type === 'txt') {
                            textFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title,
                                types: (function() {
                                    if (column.metadata['data.type'] === 'uint')
                                        return [3];
                                    return [0, 1, 2]
                                }()),
                                allowNegative: (function() {
                                    return column.metadata['data.type'] !== 'uint';
                                }()),
                                autocomplete: columnInfo.autocomplete,
                                values: columnInfo.values,
                                defaultFilterType: (function() {
                                    if (column.metadata['data.type'] === 'uint')
                                        return textFiltersTypes[3];
                                    return textFiltersTypes[1];
                                }())
                            })
                        } else if (column.metadata.type === 'seq') {
                            textFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title,
                                types: [0, 1, 2],
                                allowNegative: true,
                                autocomplete: false,
                                values: [],
                                defaultFilterType: textFiltersTypes[1]
                            });
                            sequenceFiltersColumns.push({
                                name: column.name,
                                title: column.metadata.title,
                                types: [0, 1, 2],
                                allowNegative: true,
                                autocomplete: false,
                                values: []
                            })
                        }
                    }
                });
                loading = false;

            })
            .error(function() {
                notify.error('Filters', 'Error while loading filters');
                error = true;
                loading = false;
            });




        function pickFiltersSelectData() {
            angular.forEach(textFilters, function (filter) {
                var list = document.getElementsByClassName(filter.filterId);
                angular.forEach(list, function (el) {
                    filter[el.name] = el.value;
                });
                filter.value = $('#input_'+filter.filterId).val();
            });
            angular.forEach(sequenceFilters, function (filter) {
                var list = document.getElementsByClassName(filter.filterId);
                angular.forEach(list, function (el) {
                    filter[el.name] = el.value;
                });
            })
        }

        function getTextFiltersColumns() {
            return textFiltersColumns;
        }

        function getTextFiltersTypes() {
            return textFiltersTypes;
        }

        function getTextFilters() {
            return textFilters;
        }

        function addTextFilter() {
            if (textFilters.length === 0 || textFilters[textFilters.length - 1].initialized) {
                textFilters.push({
                    index: textFilterIndex,
                    filterId: 'text_filter_' + textFilterIndex++,
                    columnId: 'Please select column name:',
                    columnTitle: 'Please select column name:',
                    value: '',
                    filterType: '',
                    negative: false,
                    allowNegative: true,
                    types: [0, 1, 2, 3],
                    initialized: false,
                    defaultFilterType: textFiltersTypes[1]
                });
            }
        }

        function copyFilter(f) {
            var deleted = deleteTextFilter(f);
            var index = textFilterIndex;
            if (deleted > -1) index = f.index;
            var new_f = {
                index: index,
                filterId: 'text_filter_' + textFilterIndex++,
                columnId: f.columnId,
                columnTitle: f.columnTitle,
                value: f.value,
                filterType: '',
                negative: f.negative,
                allowNegative: f.allowNegative,
                types: f.types,
                initialized: f.initialized,
                defaultFilterType: f.defaultFilterType
            };
            textFilters.push(new_f);
            return new_f;
        }


        function deleteTextFilter(filter) {
            var index = textFilters.indexOf(filter);
            if (index >= 0) textFilters.splice(index, 1);
            return index;
        }

        function getSequenceFiltersColumns() {
            return sequenceFiltersColumns;
        }

        function getSequenceFilters() {
            return sequenceFilters;
        }

        function addSequenceFilter() {
            sequenceFilters.push({
                filterId: 'sequence_filter_' + sequenceFilterIndex++,
                columnId: '',
                query: '',
                mismatches: 2,
                insertions: 1,
                deletions: 1,
                mutations: 2,
                depth: -1
            });
        }

        function findFilter(id) {
            for (var i = 0; i < textFilters.length; i++) {
                if (textFilters[i].filterId === id) return textFilters[i];
            }
            return null;
        }

        function deleteSequenceFilter(filter) {
            var index = sequenceFilters.indexOf(filter);
            if (index >= 0) sequenceFilters.splice(index, 1);
        }

        function isFiltersLoaded() {
            return !loading;
        }

        function isFiltersError() {
            return error;
        }

        function changeFilterSearchTypes(id, types) {
            textFilters[id].types = types;
        }

        function getDefaultFilterTypes() {
            return textFiltersTypes;
        }

        function getFiltersRequest() {
            return {
                textFilters: getTextFilters(),
                sequenceFilters: getSequenceFilters()
            }
        }

        return {
            getTextFiltersColumns: getTextFiltersColumns,
            getTextFiltersTypes: getTextFiltersTypes,
            getTextFilters: getTextFilters,
            addTextFilter: addTextFilter,
            deleteTextFilter: deleteTextFilter,
            getSequenceFiltersColumns: getSequenceFiltersColumns,
            getSequenceFilters: getSequenceFilters,
            addSequenceFilter: addSequenceFilter,
            deleteSequenceFilter: deleteSequenceFilter,
            pickFiltersSelectData: pickFiltersSelectData,
            isFiltersLoaded: isFiltersLoaded,
            isFiltersError: isFiltersError,
            changeFilterSearchTypes: changeFilterSearchTypes,
            copyFilter: copyFilter,
            findFilter: findFilter,
            getDefaultFilterTypes: getDefaultFilterTypes,
            getFiltersRequest: getFiltersRequest
        }
    }]);

    application.directive('filters', function () {
        return {
            restrict: 'E',
            controller: ['$scope', 'filters', function ($scope, filters) {

                $scope.textFilters = filters.getTextFilters();
                $scope.textFiltersColumns = filters.getTextFiltersColumns();
                $scope.textFiltersTypes = filters.getTextFiltersTypes();
                $scope.addTextFilter = filters.addTextFilter;
                $scope.deleteTextFilter = filters.deleteTextFilter;

                $scope.isTextFiltersExist = function () {
                    return $scope.textFilters.length > 0;
                };


                $scope.sequenceFilters = filters.getSequenceFilters();
                $scope.sequenceFiltersColumns = filters.getSequenceFiltersColumns();
                $scope.addSequenceFilter = filters.addSequenceFilter;
                $scope.deleteSequenceFilter = filters.deleteSequenceFilter;

                $scope.isSequenceFiltersExist = function() {
                    return $scope.sequenceFilters.length > 0;
                };

                $scope.isFiltersLoaded = filters.isFiltersLoaded;
                $scope.isFiltersError = filters.isFiltersError;

                function arraysEqual(a, b) {
                    if (a === b) return true;
                    if (a == null || b == null) return false;
                    if (a.length != b.length) return false;

                    // If you don't care about the order of the elements inside
                    // the array, you should sort both arrays here.

                    for (var i = 0; i < a.length; ++i) {
                        if (a[i] !== b[i]) return false;
                    }
                    return true;
                }

                $scope.$on('onRepeatLast', function () {
                    $('[data-toggle="tooltip"]').tooltip({
                        container: 'body'
                    });
                    applySelectTheme(function(id, name, title) {
                        $scope.$apply(function() {
                            angular.forEach(filters.getTextFiltersColumns(), function (column) {
                                if (column.name === name) {
                                    var filter = filters.findFilter(id);
                                    var filterId = id;
                                    if (!arraysEqual(filter.types, column.types)) {
                                        filter.types = column.types;
                                        filter.columnId = column.name;
                                        filter.columnTitle = column.title;
                                        filter.allowNegative = column.allowNegative;
                                        filter.defaultFilterType = column.defaultFilterType;
                                        filter.initialized = true;
                                        //todo not working ?
                                        if (column.allowNegative === false) {
                                            filter.negative = true;
                                        } else {
                                            filter.negative = false;
                                        }
                                        var new_f = filters.copyFilter(filter);
                                        filterId = new_f.filterId;
                                    }
                                    setTimeout(function() {
                                        $( "#input_" + filterId ).autocomplete({
                                            source: column.values,
                                            minLength: 0
                                        });
                                    }, 100)
                                }
                            });
                        })
                    });
                });
            }]
        }
    });

    application.directive('onLastRepeat', function () {
        return function (scope, element, attrs) {
            if (scope.$last) setTimeout(function () {
                scope.$emit('onRepeatLast', element, attrs);
            }, 1);
        };
    });

}());