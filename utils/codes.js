const codes = {

    Error:{
        Login:{
            generic: {
                message: 'Login Error.',
                code: 'NA_LGN'
            },
            invalidCredential: {
                message: 'Invalid Login Information.',
                code: 'ILI_LGN'
            },
            tooManyAttempts: {
                message: 'Too many attempts, please wait before trying again.',
                code: 'TMA_LGN'
            },
            userFieldEmpty: {
                message: 'Username or Email is Required.',
                code: 'UFE_LGN',
            },
            passwordFieldEmpty: {
                message: 'Password is Required.',
                code: 'PFE_LGN'
            }
        },
        Logout: {
            generic: {
                message: 'Logout Error.',
                code: 'NA_LGO'
            }
        },
        UserRegistration: {
            generic: {
                message: 'Error Registering User',
                code: 'NA_URG'
            },
            usernameInUse:{
                message: 'Username already in use.',
                code: 'UNU_URG'
            },
            emailInUse:{
                message: 'An account with this email address already exists.',
                code: 'EMU_URG'
            },
            invalidUsername: {
                message: 'Must contain only letters, numbers or underscore(_).',
                code: 'IUN_URG'
            },
            invalidEmail:{
                message: 'Invalid email.',
                code: 'IEM_URG'
            },
            invalidPassword: {
                message: 'Invalid Account Password. See Below for password requirments.',
                code: 'IPW_URG'
            },
            emailTooLong: {
                message: 'Email address must be less than 256 characters long.',
                code: 'ETL_URG'
            },
            usernameTooLong: {
                message: 'Username must be less than 33 characters long.',
                code: 'UTL_URG'
            },
            emailNotValidated: {
                message: 'Visit the link in the Registration email to finish registering this account.',
                code: 'ENV_URG'
            },
            userRegistraitionLinkInvalid: {
                message: 'This user registration link is invalid or expired.',
                code: 'RLI_URG'
            },
            tooManyAttempts: {
                message: 'Too many attempts, please wait before trying again.',
                code: 'TMA_URG'
            },
            emailFieldEmpty: {
                message: 'Email is Required.',
                code: 'EFE_URG',
            },
            passwordFieldEmpty: {
                message: 'Password is Required.',
                code: 'PFE_URG'
            }
        },
        ResetPassword: {
            generic: {
                message: 'Error Completing Password Reset.',
                code: 'NA_PWD'
            },
            forgotPasswordLinkInvalid: {
                message: 'This link is invalid or expired.',
                code: 'PLI_PWD'
            }
        },
        Image: {
            unknown: {
                message: 'Unknown Image Error.',
                code: 'UNK_IMG'
            },
            fileExists: {
                message: 'A file with this name already exists.',
                code: 'FEX_IMG'
            },
            invalidFileType: {
                message: 'Uploaded files must be imageManager files.',
                code: 'IFT_IMG'
            },
            cannotChangeType: {
                message: 'Cannot change file type when editing file name.',
                code: 'CGT_IMG'
            }
        },
        Table: {
            invalidSelectorType: {
                message: 'Type of selector for table rows is invalid.',
                code: 'IST_TBL'
            }
        },
        Article:{
            addGeneric: {
                message: 'Error creating new artcile.',
                code: 'NAA_ATC'
            },
            editGeneric: {
                message: 'Error editing ArticleContent.',
                code: 'NAE_ATC'
            },
            deleteGeneric: {
                message: 'Error deleting ArticleContent.',
                code: 'NAD_ATC'
            },
            titleFieldEmpty: {
                message: 'Title for the ArticleContent is required.',
                code: 'TFE_ATC'
            },
            urlPathFieldEmpty: {
                message: 'A URL Path is required.',
                code: 'UFE_ATC'
            },
            contentFieldEmpty: {
                message: 'A URL Path is required.',
                code: 'CFE_ATC'
            },
            noThumbnailSelected: {
                message: 'Please select a thumbnail for this articleContent.',
                code: 'NTS_ATC'
            },
            pathAlreadyExists: {
                message: 'An articleContent at this path already exists.',
                code: 'PAE_ATC'
            },
            pathUsedByOtherArticle: {
                message: 'ArticleContent URL Path already in use.',
                code: 'PUO_ATC'
            },
            mustHaveParent: {
                message: 'ArticleContent path must include existing parent or have no parent.',
                code: 'MHP_ATC'
            },
            thumbnailDoesNotExist: {
                message: 'Invalid Thumbnail',
                code: 'TNE_ATC'
            },
            articleContentMissing: {
                message: 'ArticleContent body cannot be empty.',
                code: 'ACM_ATC'
            },
            articleNotFound: {
                message: 'ArticleContent not found.',
                code: 'ANF_ATC'
            },
            articleUnchanged: {
                message: 'ArticleContent is unchanged.',
                code: 'AUC_ATC'
            },
            pathMissing: {
                message: 'Path Field Missing',
                code: 'PM_ATC'
            },
            cannotDeleteParent: {
                message: 'Cannot delete parent of existing articles.',
                code: 'CDP_ATC'
            },
            cannotGetCategories: {
                message: 'Unable to get articleContent categories.',
                code: 'CGG_ATC'
            },
            cannotGetImages: {
                message: 'Unable to get articleContent thumbnails.',
                code: 'CGI_ATC'
            },
            cannotGetArticleTree: {
                message: 'Unable to get articleContent path tree.',
                code: 'CGT_ATC'
            }
        }
    },
    Generic:{
        message: 'Internal Error.',
        code: 'IER_GNR'
    },
    ResetPassword: {
        emailSent: {
            message: 'An email has been sent to any email address associated with this account.',
            code: 'EMS_PWD'
        },
        success: {
            message: 'Password has been updated.',
            code: 'SCS_PWD'
        },
        logoutRequired: {
            message: 'You must be logged out to reset your password.',
            code: 'LOR_PWD'
        }
    }
}


const getCode = (code, codesObject = codes) => {

    for(var key in codesObject){

        if(typeof codesObject[key] === 'object' && !Array.isArray(codesObject[key])){

            if(codesObject[key].code === code)
                return codesObject[key];

            let recursiveSearch = getCode(code, codesObject[key]);
            if(recursiveSearch) return recursiveSearch;
        }
    }
    return null;
}

module.exports = { codes, getCode };
