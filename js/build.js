(function () {
  var forms = {};
  var globalEditModeEnabled = true;

  $('.fl-form').each(function () {
    var connection;
    var $form = $(this);
    var $formHtml = $form.find('.form-html');
    var $formResult = $form.find('.form-result');
    var $formError = $form.find('.form-error');
    var widgetData = Fliplet.Widget.getData($form.data('form-id'));
    var uuid = $form.data('form-uuid');
    var editModeEnabled = true;
    var dataSourceId;
    var dataSourceEntryId;
    var submitPromiseResolve;
    var submitPromise = new Promise(function(resolve, reject){
      submitPromiseResolve = resolve;
    });
    var fileImages = {};
    var selectedFileInputName;

    var formInstance = {
      el: this,
      data: widgetData,
      connection: connection,
      fillForm: fillForm,
      onSubmit: function () {
        return submitPromise;
      },
      onBeforeTinyMCEInit: function () {
        // Resolves immediate, unless onBeforeTinyMCEInit is replaced
        // with another Promise that resolves with an options object
        return Promise.resolve();
      },
      toggleEditMode: function (enabled) {
        editModeEnabled = !!enabled;
        resetForm();
      }
    };
    forms[uuid] = formInstance;

    $form.submit(function (event) {
      event.preventDefault();

      if (!validateForm()) {
        return Fliplet.Navigate.popup({
          popupTitle: 'Required fields',
          popupMessage: 'You need to fill in the required fields'
        });
      }

      $formError.hide();
      Fliplet.Analytics.trackEvent('form', 'submit');
      $form.addClass('submitting');

      if (!Fliplet.Navigator.isOnline()) {
        Fliplet.Navigate.popup({
          popupTitle: 'Connection error',
          popupMessage: 'You must be connected to the Internet to submit this form'
        });
        return $form.removeClass('submitting');
      }

      var formData = getFormData();
      getConnection().then(function (connection) {
        if (typeof formInstance.submit === 'function') {
          return formInstance.submit(formData);
        }

        var options = {};
        if (widgetData.folderId) {
          options.folderId = widgetData.folderId;
        }

        if (dataSourceEntryId) {
          return connection.update(dataSourceEntryId, formData, options);
        }

        return connection.insert(formData, options);
      }).then(function onSaved() {
        $formHtml.fadeOut(function(){
          $form.removeClass('submitting');
          $formResult.fadeIn();
          submitPromiseResolve();
          resetForm();
        });
      }).catch(function onError (error) {
        console.error(error);
        $formError.fadeIn().scrollTo();
        $form.removeClass('submitting');
      });
    });

    $form.on('click', '[data-start]', function (event) {
      event.preventDefault();
      $formResult.fadeOut(function () {
        $formHtml.fadeIn();
      });
    });

    $form.on('reset', function onResetForm() {
      Fliplet.Analytics.trackEvent('form', 'reset');
      resetImages();
      $formError.hide();
    });

    $form.on('click', 'input[type="file"][data-file-image]', function onClickedImageUpload (e) {
      if (Fliplet.Env.get('platform') === 'web') {
        return;
      }
      e.preventDefault();

      if (typeof navigator.camera === 'undefined') {
        return Fliplet.Navigate.popup({
          popupTitle: 'Sorry',
          popupMessage: 'It looks like your app does not support file upload. Please contact the support team for more information.'
        });
      }

      var fileInput = event.target;
      requestPicture(fileInput)
        .then(function onRequestedPicture (options) {
          getPicture(options);
        });
    });

    $form.on('change', 'input[type="file"][data-file-image]', function onImageUploadChanged (e) {
      var files = e.target.files;
      selectedFileInputName = e.target.name;
      var file;
      for (var i = 0, l = files.length; i < l; i++) {
        if (i > 0) return; // Restrict support to only 1 file at the moment

        file = files[i];
        //	Prevent any non-image file type from being read.
      	if(!file.type.match(/image.*/)){
      		return console.warn("File is not an image: ", file.type);
      	}

      	//	Create our FileReader and run the results through the render function.
      	var reader = new FileReader();
      	reader.onload = function(e){
      		onSelectedPicture(e.target.result);
      	};
      	reader.readAsDataURL(file);
      }
    });

    $.fn.scrollTo = function(speed){
      speed = speed || 400;
      return $(this).each(function(){
        $('html, body').animate({
            scrollTop: $(this).offset().top
        }, speed);
      });
    };

    function getConnection() {
      if (!connection) {
        connection = Fliplet.DataSources.connect(widgetData.dataSourceId, { offline: false });
      }

      return connection;
    }

    function validateForm() {
      var formIsValid = true;
      $form.find('.has-error').removeClass('has-error').end().find('[required]').each(function () {
        var $el = $(this);
        var name = $el.attr('name');
        var type = $el.attr('type');

        if (type === 'radio' && !$form.find('[name="'+name+'"]:checked').length) {
          formIsValid = false;
          $form.find('[name="'+name+'"]').parents('.radio').addClass('has-error');
          return;
        }

        if (type === 'checkbox' && !$el.is(':checked')) {
          formIsValid = false;
          $form.find('[name="'+name+'"]').parents('.checkbox').addClass('has-error');
          return;
        }

        if ($el.is('[data-tinymce]') && typeof tinyMCE !== 'undefined') {
          var tinymceKey = name;
          if ($el.attr('id')) {
            tinymceKey = $el.attr('id');
          }
          if (tinyMCE.get(tinymceKey) && tinyMCE.get(tinymceKey).getDoc()) {
            if (!tinyMCE.get(tinymceKey).getContent().length) {
              formIsValid = false;
              $el.parents('.form-group').addClass('has-error');
            }
            return;
          }
        }

        if (type === 'file' && $el.is('[data-file-image]') && !fileImages.hasOwnProperty(name)) {
          formIsValid = false;
          $el.parents('.form-group').addClass('has-error');
          return;
        }

        if (!$el.val().length) {
          formIsValid = false;
          $el.parents('.form-group').addClass('has-error');
          return;
        }
      });
      return formIsValid;
    }

    function getFormData () {
      var fields = {};
      var files = {};
      var formData = new FormData();

      $form.find('[name]').each(function () {
        var $el = $(this);
        var name = $el.attr('name');
        var type = $el.attr('type');

        if (type === 'file') {
          if ($el.is('[data-file-image]')) {
            return files[name] = {
              type: 'image',
              data: fileImages[name].base64
            };
          }
          return files[name] = {
            type: 'file',
            data: $el[0].files
          };
        }
        if (type === 'radio') {
          if ($el.is(':checked')) {
            return fields[name] = $el.val();
          }
        }
        if (type === 'checkbox') {
          if (!fields[name]) {
            fields[name] = [];
          }

          if ($el.is(':checked')) {
            return fields[name].push($el.val());
          }
        }
        if ($el.is('[data-tinymce]') && typeof tinyMCE !== 'undefined') {
          var tinymceKey = name;
          if ($el.attr('id')) {
            tinymceKey = $el.attr('id');
          }
          return fields[name] = tinyMCE.get(tinymceKey).getContent();
        }
        fields[name] = $el.val();
      });

      if (typeof formInstance.mapData === 'function') {
        try {
          fields = formInstance.mapData(fields);
        } catch (e) {
          console.error(e);
        }
      }

      // Transform to FormData if files were posted
      var fileNames = Object.keys(files);
      if (fileNames.length) {
        if (!Fliplet.Navigator.isOnline()) {
          return Fliplet.Navigate.popup({
            popupTitle: 'Connection error',
            popupMessage: 'You must be connected to the Internet to submit this form'
          });;
        }

        fileNames.forEach(function (fileName) {
          var fieldFiles = files[fileName];
          var file;

          if (fieldFiles.type === 'image') {
            return formData.append(fileName, fieldFiles.data);
          }

          for (var i = 0; i < fieldFiles.data.length; i++) {
            file = fieldFiles.data.item(i);
            formData.append(fileName, file);
          }
        });

        Object.keys(fields).forEach(function (fieldName) {
          var value = fields[fieldName];
          if (Array.isArray(value)) {
            value.forEach(function (val) {
              formData.append(fieldName + '[]', val);
            });
          } else {
            formData.append(fieldName, value);
          }
        });
      }

      formData = formData || fields;

      return formData;
    }

    function resetForm() {
      $form.trigger('reset');
      bindEditMode();
    }

    function fillForm(data) {
      Object.keys(data).forEach(function (key) {
        var value = data[key];
        var $input = $form.find('[name="' + key + '"], [name="' + key + '[]"]');
        var type = $input.attr('type');

        if (Array.isArray(value)) {
          value.forEach(function (val) {
            $input.filter('[value="' + val + '"]')
              .prop('checked', true)
              .prop('selected', true);
          });
        } else {
          if (!$input.length || type === 'file') {
            $input = $('<input class="fl-data" type="hidden" name="' + key + '" />');
            $input.val(value);
            $form.prepend($input);
          } else {
            if (type === 'password') {
              // Never fill in password fields
              return;
            }

            if (type === 'radio') {
              return $input.filter('[value="' + value + '"]').prop('checked', true);
            } else if ($input.is('[data-tinymce]') && typeof tinyMCE !== 'undefined') {
              var tinymceKey = key;
              if ($input.attr('id')) {
                tinymceKey = $input.attr('id');
              }
              if (tinyMCE.get(tinymceKey).getDoc()) {
                return tinyMCE.get(tinymceKey).setContent(value);
              }
            }
            $input.val(value);
          }
        }
      });
    }

    function bindEditMode() {
      if (editModeEnabled && Fliplet.Navigate.query.dataSourceId === widgetData.dataSourceId) {
        getConnection().then(function (connection) {
          dataSourceEntryId = parseInt(Fliplet.Navigate.query.dataSourceEntryId);
          return connection.findById(dataSourceEntryId);
        }).then(function (dataSourceEntry) {
          if (!dataSourceEntry) {
            return;
          }

          $form.find('input.fl-data[type="hidden"]').remove();

          fillForm(dataSourceEntry.data);

          var $submit = $form.find('[type="submit"]');
          var editLabel = $submit.data('edit-label');
          if (editLabel) {
            $submit.html(editLabel); // button
            $submit.val(editLabel);  // input
          }
        }, function () {
          // Entry not found, or user has got no access to it
          dataSourceEntryId = null;
        });
      }
    }

    function initialiseTinyMCE () {
      if ($('textarea[data-tinymce]').length && typeof tinymce !== 'undefined') {
        var tinymcePlugins = [
          'advlist autolink lists link image charmap hr',
          'searchreplace insertdatetime table textcolor colorpicker',
          'autoresize fullscreen code emoticons paste textcolor colorpicker imagetools'
        ];
        var tinymceToolbar = 'undo redo | formatselect | fontsizeselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | blockquote subscript superscript | table charmap hr | forecolor backcolor | removeformat code fullscreen';

        formInstance.onBeforeTinyMCEInit().then(function (opts) {
          // opts @Object Custom TinyMCE options
          opts = opts || {};
          if (opts.hasOwnProperty('plugins')) {
            tinymcePlugins.push(opts.plugins);
          }
          if (opts.hasOwnProperty('toolbar')) {
            tinymceToolbar = tinymceToolbar + ' | ' + opts.toolbar;
          }
          tinymce.init({
            selector: 'textarea[data-tinymce]',
            theme: 'modern',
            plugins: tinymcePlugins.join(' '),
            toolbar: tinymceToolbar,
            image_advtab: true,
            menubar: false,
            statusbar: true,
            inline: false,
            resize: true,
            autoresize_bottom_margin: 50,
            autoresize_max_height: 500,
            autoresize_min_height: 250
          });
        });
      }
    }

    function requestPicture (fileInput) {
      selectedFileInputName = fileInput.name;
      var boundingClientRectTarget = fileInput;
      var boundingRect = boundingClientRectTarget.getBoundingClientRect();
      while( boundingRect.width === 0 || boundingRect.height === 0 ) {
        if (!boundingClientRectTarget.parentNode) {
          break;
        }
        boundingClientRectTarget = boundingClientRectTarget.parentNode;
        boundingRect = boundingClientRectTarget.getBoundingClientRect();
      }

      return new Promise(function(resolve, reject){
        var cameraOptions = {
          boundingRect: boundingRect
        };
        navigator.notification.confirm(
          'How do you want to choose your image?',
          function onSelectedImageMethod (button) {
            document.body.focus();
            switch (button) {
              case 1:
                cameraOptions.source = Camera.PictureSourceType.CAMERA;
                return resolve(cameraOptions);
              case 2:
                cameraOptions.source = Camera.PictureSourceType.PHOTOLIBRARY;
                return resolve(cameraOptions);
              default:
                return;
            }
          },
          'Choose Image',
          ['Take Photo', 'Choose Existing Photo', 'Cancel']
        );
      });
    }

    function getPicture (options) {
      options = options || {};
      if (Fliplet.Env.get('platform') === 'web') {
        return;
      }

      if (typeof navigator.camera === 'undefined') {
        return Fliplet.Navigate.popup({
          popupTitle: 'Sorry',
          popupMessage: 'It looks like your app does not support file upload. Please contact the support team for more information.'
        });
      }

      var popoverOptions = {
        arrowDir: Camera.PopoverArrowDirection.ARROW_ANY
      };
    	if ( typeof options.boundingRect === 'object' ) {
        var boundingRect = options.boundingRect;
    		popoverOptions.x = boundingRect.left;
    		popoverOptions.y = boundingRect.top;
    		popoverOptions.width = boundingRect.width;
    		popoverOptions.height = boundingRect.height;
    	}

      navigator.camera.getPicture(onSelectedPicture, function getPictureSuccess (message) {
    		console.error('Error getting picture with navigator.camera.getPicture');
    	},{
    		quality: 80,
    		destinationType: Camera.DestinationType.DATA_URL,
    		sourceType: (options.source) ? options.source : Camera.PictureSourceType.PHOTOLIBRARY,
    		targetWidth: (options.width) ? options.width : 1024,
    		targetHeight: (options.height) ? options.height : 1024,
    		popoverOptions : popoverOptions,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        correctOrientation: true  // Corrects Android orientation quirks
    	});
    }

    function onSelectedPicture (imageURI) {
      imageURI = (imageURI.indexOf('base64') > -1) ? imageURI : 'data:image/jpeg;base64,' +imageURI;
    	fileImages[selectedFileInputName] = {
    		base64: imageURI
    	};

      $('canvas[data-file-name="'+selectedFileInputName+'"]').each(function forEachCanvas () {
        var canvas = this;
        var imgSrc = imageURI;
      	var canvasWidth = canvas.clientWidth;
      	var canvasHeight = canvas.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        var canvasRatio = canvasWidth/canvasHeight;
      	var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

      	var img = new Image();
      	img.onload = function drawImageOnCanvas () {
          var imgWidth = this.width;
          var imgHeight = this.height;
          var imgRatio = imgWidth/imgHeight;

          // Re-interpolate image draw dimensions based to CONTAIN within canvas
          if (imgRatio < canvasRatio) {
            // IMAGE RATIO is slimmer than CANVAS RATIO, i.e. margin on the left & right
            if (imgHeight > canvasHeight) {
              // Image is taller. Resize image to fit height in canvas first.
              imgHeight = canvasHeight;
              imgWidth = imgHeight*imgRatio;
            }
          } else {
            // IMAGE RATIO is wider than CANVAS RATIO, i.e. margin on the top & bottom
            if (imgWidth > canvasWidth) {
              // Image is wider. Resize image to fit width in canvas first.
              imgWidth = canvasWidth;
              imgHeight = imgWidth/imgRatio;
            }
          }

      		var drawX = (canvasWidth > imgWidth) ?  (canvasWidth - imgWidth)/2 : 0 ;
      		var drawY = (canvasHeight > imgHeight) ?  (canvasHeight - imgHeight)/2 : 0 ;

       		context.drawImage(this, drawX, drawY, imgWidth, imgHeight);
      	};
      	img.src = imgSrc;
      });
    }

    function resetImages () {
      fileImages = {};
      selectedFileInputName = null;
      $('canvas[data-file-name]').each(function(){
        this.getContext('2d').clearRect(0, 0, this.width, this.height);
      });
    }

    Fliplet.Navigator.onReady().then(function () {
      initialiseTinyMCE();
      if (globalEditModeEnabled) {
        bindEditMode();
      }
    });
  });

  Fliplet.Widget.register('com.fliplet.form', function () {
    return {
      disableAutoBindMode: function () {
        globalEditModeEnabled = false;
      },
      forms: function (uuid) {
        if (uuid) {
          return forms[uuid];
        }

        return Object.keys(forms).map(function (uuid) {
          return forms[uuid];
        });
      }
    };
  });

})();
