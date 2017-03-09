(function() {
    "use strict";

    var app = angular.module("index", []);

    app.directive('summary', function() {
       return {
           restrict: 'E',
           templateUrl: '/summary'
       }
    });

}());