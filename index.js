import React, { Component } from 'react'
import { Prompt } from 'react-router-dom'
import Modal from 'react-modal'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Link } from 'react-router-dom'
import { JsonData, LightLabel } from '../../components/CommonUI'
import { SubHeader } from '../../components/CommonUI/Headers'
import { Input } from '../../components/CommonUI/Inputs'
import { infoToast, warnToast } from '../../components/CommonUI/Toasts'
import InitialLoadSpinner from '../../components/Shared/Spinner/InitialLoadSpinner'
import { FormTypes } from './formTypes'
import { displayByOrder } from '../../helpers'
import { Button, ButtonRow } from '../../components/CommonUI/Buttons'
import { updateForm, fetchForms } from '../../store/forms'
import NewFontIcon from '@material-ui/core/Icon'
import {
    modelEdit,
    modelOptionEdit,
    modelToggleEdit,
    modelOptionDelete,
    modelOptionReorder,
    handleSelectedValueChange,
    addElement,
    getItemStyle,
} from './builderHelpers'

import availableElements, { SelectedEditableElement, getSelected } from '../../components/BuilderComponents'
import { isDeveloper, isSuperUser } from '../../utils/User'
import { ButtonWithIcon } from '../../components/CommonUI/Buttons/index'
import FontIcon from '@material-ui/core/Icon'
import { Checkbox, MenuItem, Select, Switch, FormControlLabel } from '@material-ui/core'
import HeaderWithArrow from '../../components/Shared/HeaderWithArrow/HeaderWithArrow'
import { FormContextHolder } from './formContext'
import { ACTION_ITEM_FORM, entityHasFeature } from '../../utils/Features'
import CertificationStatements, { labelStyle } from './certificationStatements'
export const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        height: '204px',
        width: '375px',
    },
}

class FormEditor extends Component {
    _isMounted = false
    constructor(props) {
        super(props)

        this.state = {
            modalIsOpen: false,
            doneLoading: false,
            saveStatus: '',
            currentlyPreviewing: 'Edit',
            selectedForm: {
                title: '',
                formItems: {},
            },
            formItems: {},
            selectedEditable: {
                //ex:  '1512263336176': true,
            },
            selectedValues: {
                //this is the values from the selected form elemements
            },
            newPrebuiltForm: false,
            allowOperatorSignature: false,
            certificationNumber1: false,
            certificationNumber2: false,
            certificationNumber3: false,
            actionItemCertification: false,
            certification1Label: null,
            certification1Statement: null,
            certification2Label: null,
            certification2Statement: null,
            certification3Label: null,
            certification3Statement: null,
            actionItemCertificationLabel: null,
            actionItemCertificationStatement: null,
            signature2LocksEdits: true,
            signature2RequiresAiComplete: true,
            signature3LocksEdits: true,
            signature3RequiresAiComplete: true,
            actionItemChecked: false,
            signature1Checked: false,
            signature2Checked: false,
            signature3Checked: false,
            actionItemCertificationHide: false,
            signature1CertificationHide: false,
            signature2CertificationHide: false,
            signature3CertificationHide: false,
        }
        this.openModal = this.openModal.bind(this)
        //    this.afterOpenModal = this.afterOpenModal.bind(this);
        this.closeModal = this.closeModal.bind(this)
        this.handleCertificationShow = this.handleCertificationShow.bind(this)
        this.handleToggleSignature = this.handleToggleSignature.bind(this)
        this.handleStatementChange = this.handleStatementChange.bind(this)
        this.clearStatements = this.clearStatements.bind(this)
        this.clearActionItemCertification = this.clearActionItemCertification.bind(this)
        this.handleToggleOperatorSignature = this.handleToggleOperatorSignature.bind(this)
    }
    openModal() {
        const {
            history,
            location: { state },
        } = this.props
        const { saveStatus } = this.state
        if (saveStatus === 'unsaved') {
            this.setState({ modalIsOpen: true })
        } else {
            state && history.push(state.backLink)
        }
    }
    closeModal() {
        this.setState({ modalIsOpen: false })
    }

    async componentDidMount() {
        const { match: { params = {} } = {}, forms, match } = this.props
        const newPrebuiltForm = !params.formId
        const formKeys = forms && Object.keys(forms)
        this._isMounted = true
        if (params.formId) {
            await this.props.fetchForms(params.formId)
        }
        if (this._isMounted) {
            this.setState({
                doneLoading: !this.state.doneLoading,
                saveStatus: match.url.includes('add') && formKeys.length > 0 ? 'unsaved' : '',
                newPrebuiltForm,
            })
        }
        if (
            !!(
                this.state.actionItemCertification ||
                this.state.actionItemCertificationLabel ||
                this.state.actionItemCertificationStatement
            )
        ) {
            this.setState({ actionItemChecked: true })
        }
        if (this.state.certificationNumber1 || this.state.certification1Label || this.state.certification1Statement) {
            this.setState({ signature1Checked: true })
        }
        if (this.state.certificationNumber2 || this.state.certification2Label || this.state.certification2Statement) {
            this.setState({ signature2Checked: true })
        }
        if (this.state.certificationNumber3 || this.state.certification3Label || this.state.certification3Statement) {
            this.setState({ signature3Checked: true })
        }
    }

    async componentDidUpdate(prevProps, prevState) {
        const { match: { params = {} } = {}, forms } = this.props
        const noFormLoaded = !this.state.selectedForm.uuid

        if (noFormLoaded && Object.keys(forms).length && !prevState.selectedForm.uuid) {
            forms[params.formId]
                ? this.handleLoadForm(forms[params.formId])
                : this.handleLoadForm(forms[Object.keys(forms)[0]])
            if (this._isMounted) {
                this.setState({
                    newPrebuiltForm: false, // set state to let component know it is a copy and not a new form
                })
            }
        }
    }

    componentWillUnmount() {
        // clear redux store forms on leaving editor.
        const { formItems } = this.state
        this._isMounted = false
        if (Object.keys(formItems).length > 0) {
            this.props.fetchForms(null)
        }

        this.setState({
            doneLoading: false,
            saveStatus: '',
            currentlyPreviewing: 'Edit',
            selectedForm: {
                title: '',
                formItems: {},
            },
            formItems: {},
            selectedEditable: {
                //ex:  '1512263336176': true,
            },
            selectedValues: {
                //this is the values from the selected form elemements
            },
            newPrebuiltForm: false,
            allowOperatorSignature: false,
            certificationNumber1: false,
            certificationNumber2: false,
            certificationNumber3: false,
            actionItemCertification: false,
            certification1Label: null,
            certification1Statement: null,
            certification2Label: null,
            certification2Statement: null,
            certification3Label: null,
            certification3Statement: null,
            actionItemCertificationLabel: null,
            actionItemCertificationStatement: null,
        })
    }

    handleLoadForm(selectedForm) {
        const urlParams = new URLSearchParams(window.location.search)
        const formTitle = urlParams.get('title') || selectedForm.title
        if (selectedForm && !this.state.newPrebuiltForm && this._isMounted) {
            const {
                formItems,
                allowOperatorSignature,
                certification1Label,
                certification1Statement,
                certification2Label,
                certification2Statement,
                certification3Label,
                certification3Statement,
                actionItemCertificationLabel,
                actionItemCertificationStatement,
                signature2LocksEdits,
                signature2RequiresAiComplete,
                signature3LocksEdits,
                signature3RequiresAiComplete,
                ...selectedFormRest
            } = selectedForm
            // NOTE don't want to keep track of all of the potential form form fields...
            // so we spread!
            this.setState({
                selectedForm: { ...selectedFormRest, title: formTitle },
                allowOperatorSignature,
                certification1Label,
                certification1Statement,
                certification2Label,
                certification2Statement,
                certification3Label,
                certification3Statement,
                actionItemCertificationLabel,
                actionItemCertificationStatement,
                signature2LocksEdits,
                signature2RequiresAiComplete,
                signature3LocksEdits,
                signature3RequiresAiComplete,
                certificationNumber1:
                    selectedForm.certification1Label || selectedForm.certification1Statement ? true : false,
                certificationNumber2:
                    selectedForm.certification2Label || selectedForm.certification2Statement ? true : false,
                certificationNumber3:
                    selectedForm.certification3Label || selectedForm.certification3Statement ? true : false,
                actionItemCertification: !!(
                    selectedForm.actionItemCertificationLabel || selectedForm.actionItemCertificationStatement
                ),
                formItems,
            })
        }
    }

    async handleFormStorage() {
        this.setState({ saveStatus: 'saving' })
        const { match, user, location } = this.props
        const {
            allowOperatorSignature,
            certificationNumber2,
            certificationNumber3,
            actionItemCertification,
            certification1Label,
            certification1Statement,
            certification2Label,
            certification2Statement,
            certification3Label,
            certification3Statement,
            actionItemCertificationLabel,
            actionItemCertificationStatement,
            signature2LocksEdits,
            signature2RequiresAiComplete,
            signature3LocksEdits,
            signature3RequiresAiComplete,
            actionItemChecked,
            signature1Checked,
            signature2Checked,
            signature3Checked,
        } = this.state
        const isCreate = !match.params.formId
        const optionUuid = new Date().getTime()
        let savedMessage = 'Pre-Built Form saved'
        let params = new URLSearchParams(window.location.search)
        const isSystem = params.get('form') === 'system' ? true : false
        const formType = params.get('form') || 'system'
        const entityUuid = params.get('entityUuid') || match.params.entityUuid

        if (certificationNumber2 && (!certification2Label || !certification2Statement)) {
            alert('certification 2 has missing fields, Please complete to save form.')
            this.setState({ saveStatus: 'error' })
            return false
        }

        if (certificationNumber3 && (!certification3Label || !certification3Statement)) {
            alert('certification 3 has missing fields, Please complete to save form.')
            this.setState({ saveStatus: 'error' })
            return false
        }

        if (actionItemCertification && (!actionItemCertificationLabel || !actionItemCertificationStatement)) {
            alert('Action item certification has missing fields, Please complete to save form.')
            this.setState({ saveStatus: 'error' })
            return false
        }

        if (Object.keys(this.state.formItems).length === 0) {
            alert('You must add at least one Form Component to save the form.')
            this.setState({ saveStatus: 'error' })
            return false
        }

        try {
            let updatedForm = {
                ...this.state.selectedForm,
                formItems: this.state.formItems,
                allowOperatorSignature,
                certification1Label: signature1Checked ? certification1Label : null,
                certification1Statement: signature1Checked ? certification1Statement : null,
                certification2Label: signature2Checked ? certification2Label : null,
                certification2Statement: signature2Checked ? certification2Statement : null,
                certification3Label: signature3Checked ? certification3Label : null,
                certification3Statement: signature3Checked ? certification3Statement : null,
                actionItemCertificationLabel: actionItemChecked ? actionItemCertificationLabel : null,
                actionItemCertificationStatement: actionItemChecked ? actionItemCertificationStatement : null,
                signature2LocksEdits: signature2Checked ? signature2LocksEdits : null,
                signature2RequiresAiComplete: signature2Checked ? signature2RequiresAiComplete : null,
                signature3LocksEdits: signature3Checked ? signature3LocksEdits : null,
                signature3RequiresAiComplete: signature3Checked ? signature3RequiresAiComplete : null,
            }

            if (isCreate) {
                updatedForm = {
                    ...updatedForm,
                    system: isSystem,
                    uuid: `uuid${optionUuid}`,
                    version: 2,
                    active: true,
                    createdByUserUuid: user.userId,
                    formGroup: formType.toUpperCase(),
                }
                if (formType === 'custom' && entityUuid) {
                    updatedForm = {
                        ...updatedForm,
                        entityUuid,
                    }
                }
            }

            if (formType === 'custom' || updatedForm.entityDisplayName) {
                savedMessage = 'Custom Form saved'
            }

            await this.props.updateForm(updatedForm, isCreate)
            const { forms, history } = this.props
            const key = Object.keys(forms)
            const keyIndex = key.length === 2 ? 1 : 0
            if (forms[key[keyIndex]] && forms[key[keyIndex]].formItems) {
                this.setState({
                    saveStatus: 'saved',
                    formItems: forms[key[keyIndex]].formItems,
                })
                infoToast(savedMessage)
                history.push({
                    pathname: `/form/edit/${key[keyIndex]}`,
                    state: { ...location.state },
                })
                return false
            }

            warnToast('Please choose a Form Type')
            this.setState({ saveStatus: 'error' })
        } catch (error) {
            warnToast('Something failed')
            throw error
        }
    }

    handlePreviewSwitch(previewSection) {
        this.setState({ currentlyPreviewing: previewSection })
    }

    handleUnsaved() {
        const { saveStatus } = this.state

        if (saveStatus !== 'unsaved' && this._isMounted) {
            this.setState({ saveStatus: 'unsaved' })
        }
    }

    handleNameChange(target) {
        const { selectedForm } = this.state

        this.handleUnsaved()

        this.setState({
            selectedForm: {
                ...selectedForm,
                title: target.value,
            },
        })
    }

    handleAddElement(entryType, index) {
        const { formItems } = this.state

        // update state to unsaved.
        this.handleUnsaved()

        if (!index && index !== 0) {
            index = Object.keys(formItems).length
        }
        this.setState(addElement(entryType, index))
    }

    handleDeleteSelected(selectedUid) {
        const { formItems } = this.state

        // NOTE in this case we only want to toggle
        let formItemsCopy = { ...formItems }

        // update state to unsaved.
        this.handleUnsaved()

        // Re-arrange display order so that they stay in order.
        for (const item in formItemsCopy) {
            const oldIndex = formItemsCopy[selectedUid].model.displayOrder
            const itemOrder = formItemsCopy[item].model.displayOrder
            if (itemOrder > oldIndex) {
                formItemsCopy[item].model.displayOrder = itemOrder - 1
            }
        }

        delete formItemsCopy[selectedUid]

        //TODO need to remove the edited state to...
        //could open edit state for a dozen fields then delete them leaving the edit states still there
        //not a huge deal but just sloppy

        this.setState({
            formItems: formItemsCopy,
        })
    }

    handleSelectedEditArea(selectedUid) {
        // update state to unsaved.
        this.handleUnsaved()

        // NOTE in this case we only want to toggle`
        if (this._isMounted) {
            this.setState(modelToggleEdit(selectedUid))
        }
    }

    handleModelEdit(uuid, type, value) {
        // update state to unsaved.
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState(modelEdit(uuid, type, value))
        }
    }

    handleModelOptionEdit(uuid, type, value) {
        // update state to unsaved.
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState(modelOptionEdit(uuid, type, value))
        }
    }

    handleModelOptionDelete(uuid, optionName) {
        // update state to unsaved.
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState(modelOptionDelete(uuid, optionName))
        }
    }

    handleOptionsDragEnd(result) {
        // update state to unsaved.
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState(modelOptionReorder(result))
        }
    }

    handleValueChange(uuid, target) {
        // update state to unsaved.
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState(handleSelectedValueChange(uuid, target))
        }
    }

    handleCertificationShow(stateFieldName, stateFieldChecked, stateFieldNameHide) {
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState({
                [stateFieldName]: !this.state[stateFieldName],
                [stateFieldChecked]: !this.state[stateFieldName],
                [stateFieldNameHide]: false,
            })
        }
    }
    handleCompleteEditing(stateFieldNameHide) {
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState({
                [stateFieldNameHide]: true,
            })
        }
    }

    handleStatementChange(event) {
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState({
                [event.target.name]: event.target.value,
            })
        }
    }

    handleToggleSignature(certificationToggle) {
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState({
                [certificationToggle]: !this.state[certificationToggle],
            })
        }
    }

    handleToggleOperatorSignature() {
        this.handleUnsaved()
        if (this._isMounted) {
            this.setState({ allowOperatorSignature: !this.state.allowOperatorSignature })
        }
    }

    clearStatements(certificationNumber) {
        if (this._isMounted) {
            this.setState({
                [`certification${certificationNumber}Label`]: null,
                [`certification${certificationNumber}Statement`]: null,
                [`signature${certificationNumber}LocksEdits`]: true,
                [`signature${certificationNumber}RequiresAiComplete`]: true,
                [`signature${certificationNumber}RequiresAiComplete`]: true,
                [`signature${certificationNumber}Checked`]: false,
            })
        }

        this.handleCertificationShow(`certificationNumber${certificationNumber}`)
    }

    clearActionItemCertification() {
        if (this._isMounted) {
            this.setState({ actionItemCertificationLabel: '', actionItemCertificationStatement: '' })
        }

        this.handleCertificationShow('actionItemCertification')
    }

    reOrderItems(formItems, updatedFormItems, oldIndex, result, changeOption) {
        // check if the item moved up the list to a smaller index position and re-arange the items effected by the shift
        if (changeOption) {
            for (const option in formItems[result.type].model.options) {
                const itemOrder = formItems[result.type].model.options[option].displayOrder
                if (itemOrder < oldIndex && itemOrder >= result.destination.index && result.draggableId !== option) {
                    updatedFormItems[result.type].model.options[option].displayOrder = itemOrder + 1
                }
                if (itemOrder > oldIndex && itemOrder <= result.destination.index && result.draggableId !== option) {
                    updatedFormItems[result.type].model.options[option].displayOrder = itemOrder - 1
                }
            }
        } else {
            for (const item in formItems) {
                const itemOrder = formItems[item].model.displayOrder
                if (itemOrder < oldIndex && itemOrder >= result.destination.index && result.draggableId !== item) {
                    updatedFormItems[item].model.displayOrder = itemOrder + 1
                }
                if (itemOrder > oldIndex && itemOrder <= result.destination.index && result.draggableId !== item) {
                    updatedFormItems[item].model.displayOrder = itemOrder - 1
                }
            }
        }
    }

    handleDragEnd = (result) => {
        const { source, destination, draggableId } = result
        const { formItems } = this.state

        // dropped outside the list
        if (!destination) return

        if (source.droppableId === 'options') {
            return this.handleOptionsDragEnd(result)
        }

        const isAddingElementToSelected =
            source.droppableId === 'availableElements' && destination.droppableId === 'formItems'

        let oldIndex
        let updatedFormItems
        if (formItems[result.draggableId]) {
            oldIndex = formItems[result.draggableId].model.displayOrder
            updatedFormItems = formItems
            // set the current dragged item index correctly
            updatedFormItems[result.draggableId].model.displayOrder = destination.index
            this.reOrderItems(formItems, updatedFormItems, oldIndex, result)
        } else if (formItems[result.type] && formItems[result.type].model.options[result.draggableId]) {
            oldIndex = formItems[result.type].model.options[result.draggableId].displayOrder
            updatedFormItems = formItems
            updatedFormItems[result.type].model.options[result.draggableId].displayOrder = destination.index
            this.reOrderItems(formItems, updatedFormItems, oldIndex, result, true)
        }

        const newFormItemsObj = { ...formItems, ...updatedFormItems }

        if (this._isMounted) {
            this.setState({
                formItems: newFormItemsObj,
            })
        }

        if (isAddingElementToSelected) {
            //NOTE using this callback since setState is async, we need sync here...
            //TODO this proves a better case for the functional setStates
            return this.handleAddElement(draggableId, destination.index)
        }
    }

    renderSelectedEdit = (selected, index, provided) => {
        const { selectedEditable } = this.state
        const selectedEditableArr = Object.keys(selectedEditable)
        const isSelected = selectedEditableArr.find((item) => item === selected.uuid)

        const isEditing = isSelected ? selectedEditable[selected.uuid] : false
        //NOTE this is the editable varation (between edit and preview) of each component
        return (
            <SelectedEditableElement
                key={index}
                index={index}
                selected={selected}
                selectedValue={selected.type}
                provided={provided}
                isEditing={isEditing}
                handleSelectedEditArea={(o) => {
                    this.handleSelectedEditArea(o)
                }}
                handleDeleteSelected={(o) => this.handleDeleteSelected(o)}
                handleModelEdit={(...o) => this.handleModelEdit(...o)}
                handleModelOptionEdit={(...o) => this.handleModelOptionEdit(...o)}
                handleModelOptionDelete={(...o) => this.handleModelOptionDelete(...o)}
                handleValueChange={(uuid, target) => this.handleValueChange(uuid, target)}
            />
        )
    }

    renderSelectedPreview = (selected, index) => {
        // NOTE grabbing the element for the selected type and passing in the model
        // TODO need to abstract this to its own method as its no clean way to use components directly,
        // needs to be dynamic when selecting

        const { type, model, uuid } = selected

        return (
            <SelectedEntryWrapper preview key={index}>
                {getSelected(type).element &&
                    React.cloneElement(getSelected(type).element, {
                        handleValueChange: (target) => this.handleValueChange(uuid, target),
                        selectedValue: this.state.selectedValues[selected.uuid],
                        model,
                        uuid: uuid,
                    })}
            </SelectedEntryWrapper>
        )
    }

    renderFormControls() {
        const {
            currentlyPreviewing,
            selectedForm,
            saveStatus,
            allowOperatorSignature,
            certificationNumber1,
            certificationNumber2,
            certificationNumber3,
            actionItemCertification,
            certification1Label,
            certification1Statement,
            certification2Label,
            certification2Statement,
            certification3Label,
            certification3Statement,
            actionItemCertificationLabel,
            actionItemCertificationStatement,
            signature2LocksEdits,
            signature2RequiresAiComplete,
            signature3LocksEdits,
            signature3RequiresAiComplete,
            actionItemChecked,
            signature1Checked,
            signature2Checked,
            signature3Checked,
            actionItemCertificationHide,
            signature1CertificationHide,
            signature2CertificationHide,
            signature3CertificationHide,
        } = this.state

        // const showNeedNameError =
        //     selectedForm.company &&
        //     !selectedForm.company.length &&
        //     saveStatus === 'error'

        let toggleButtons = ['Edit', 'Preview']
        if (isDeveloper(this.props.user) || isSuperUser(this.props.user)) {
            toggleButtons = ['Edit', 'Preview', 'Data']
        }

        const hasFormFeature = (formType) => !formType.feature || entityHasFeature(this.props.entity, ACTION_ITEM_FORM)

        return (
            <div>
                <BuilderControlPanel>
                    <BuilderColumn>
                        <Input
                            large
                            placeholder="Enter in text..."
                            inputLabel="Form Name"
                            value={selectedForm.title}
                            style={{ fontSize: '17px', height: '35px' }}
                            onChange={({ target }) => this.handleNameChange(target)}
                            id="formNameInput"
                        />
                    </BuilderColumn>
                    <ColumnPadding>
                        <BuilderButtons>
                            <LightLabel>Form Type</LightLabel>
                            <Select
                                label="Select one"
                                value={this.state.selectedForm.type}
                                onChange={(event) => {
                                    this.setState({
                                        selectedForm: {
                                            ...selectedForm,
                                            type: event.target.value,
                                        },
                                    })
                                }}
                                fullWidth={true}
                                style={{ marginTop: '-20px' }}
                            >
                                {FormTypes.filter((ft) => hasFormFeature(ft)).map(({ label, value }) => (
                                    <MenuItem key={value} value={value}>
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </BuilderButtons>
                    </ColumnPadding>
                </BuilderControlPanel>
                <CertificationStatementsBlock>
                    <CertificationStatements
                        number={1}
                        cardinalNumber="1st"
                        certificationNumber={certificationNumber1}
                        certificationLabel={certification1Label}
                        certificationStatement={certification1Statement}
                        certificationHide={signature1CertificationHide}
                        showSwitches={false}
                        handleCertificationShow={() => {
                            this.handleCertificationShow(
                                'certificationNumber1',
                                'signature1Checked',
                                'signature1CertificationHide'
                            )
                        }}
                        handleCompleteEditing={() => this.handleCompleteEditing('signature1CertificationHide')}
                        handleStatementChange={this.handleStatementChange}
                        handleToggleSignature={this.handleToggleSignature}
                        clearStatements={this.clearStatements}
                        checked={signature1Checked}
                    />
                    <CertificationStatements
                        number={2}
                        cardinalNumber="2nd"
                        certificationNumber={certificationNumber2}
                        certificationLabel={certification2Label}
                        certificationStatement={certification2Statement}
                        signatureLocksEdits={signature2LocksEdits}
                        signatureRequiresAiComplete={signature2RequiresAiComplete}
                        certificationHide={signature2CertificationHide}
                        showSwitches={true}
                        handleCertificationShow={() => {
                            this.handleCertificationShow(
                                'certificationNumber2',
                                'signature2Checked',
                                'signature2CertificationHide'
                            )
                        }}
                        handleCompleteEditing={() => this.handleCompleteEditing('signature2CertificationHide')}
                        handleStatementChange={this.handleStatementChange}
                        handleToggleSignature={this.handleToggleSignature}
                        clearStatements={this.clearStatements}
                        checked={signature2Checked}
                    />
                    <CertificationStatements
                        number={3}
                        cardinalNumber="3rd"
                        certificationNumber={certificationNumber3}
                        certificationLabel={certification3Label}
                        certificationStatement={certification3Statement}
                        signatureLocksEdits={signature3LocksEdits}
                        signatureRequiresAiComplete={signature3RequiresAiComplete}
                        certificationHide={signature3CertificationHide}
                        showSwitches={true}
                        handleCertificationShow={() => {
                            this.handleCertificationShow(
                                'certificationNumber3',
                                'signature3Checked',
                                'signature3CertificationHide'
                            )
                        }}
                        handleCompleteEditing={() => this.handleCompleteEditing('signature3CertificationHide')}
                        handleStatementChange={this.handleStatementChange}
                        handleToggleSignature={this.handleToggleSignature}
                        clearStatements={this.clearStatements}
                        checked={signature3Checked}
                    />
                    <Label htmlFor="actionItemCertificationLabel">
                        <FlexContainer>
                            <FormControlLabel
                                control={
                                    <CheckboxStyled
                                        checked={actionItemChecked}
                                        onChange={() =>
                                            this.handleCertificationShow(
                                                'actionItemCertification',
                                                'actionItemChecked',
                                                'actionItemCertificationHide'
                                            )
                                        }
                                        $certificationnumber={actionItemCertification}
                                        name="actionItemCertification"
                                        color="primary"
                                        style={actionItemChecked ? { marginRight: '-4px', marginLeft: '-4px' } : {}}
                                    />
                                }
                                label="Action item certification statement"
                                style={actionItemChecked && !actionItemCertificationHide ? labelStyle : {}}
                            />
                            {!actionItemCertificationHide && actionItemCertification && (
                                <Input
                                    containerStyle={{ width: '100%', margin: 0 }}
                                    innerContainerStyle={{ margin: 0 }}
                                    name="actionItemCertificationLabel"
                                    id="actionItemCertificationLabel"
                                    placeholder="Action Item Certification Title"
                                    value={actionItemCertificationLabel || ''}
                                    onChange={this.handleStatementChange}
                                />
                            )}
                        </FlexContainer>
                        {actionItemCertification && !actionItemCertificationHide && (
                            <>
                                <Input
                                    textarea
                                    containerStyle={{ margin: 0 }}
                                    name="actionItemCertificationStatement"
                                    id="actionItemCertificationStatement"
                                    placeholder="Action Item Certification Statement"
                                    value={actionItemCertificationStatement || ''}
                                    onChange={this.handleStatementChange}
                                />
                                <IconContainer>
                                    <RightSide>
                                        <NewFontIcon
                                            onClick={this.clearActionItemCertification}
                                            className="material-icons"
                                            style={{ color: 'red' }}
                                        >
                                            close
                                        </NewFontIcon>
                                        <NewFontIcon
                                            onClick={() => this.handleCompleteEditing('actionItemCertificationHide')}
                                            className="material-icons"
                                            style={{ color: 'var(--green)' }}
                                        >
                                            check
                                        </NewFontIcon>
                                    </RightSide>
                                </IconContainer>
                            </>
                        )}
                    </Label>
                    <Label htmlFor="allowOperatorSignature">
                        <FormControlLabel
                            control={
                                <Switch
                                    onChange={this.handleToggleOperatorSignature}
                                    checked={allowOperatorSignature}
                                    color="primary"
                                />
                            }
                            label="Allow Operator Signature Action Item Priority"
                            fullWidth={true}
                        />
                    </Label>
                </CertificationStatementsBlock>
                <BuilderControlPanel>
                    <BuilderColumn>
                        <ButtonRow dividers style={{ width: 300 }}>
                            {toggleButtons.map((name) => (
                                <Button
                                    key={name}
                                    onClick={() => this.handlePreviewSwitch(name)}
                                    textButton={currentlyPreviewing !== name}
                                    children={name}
                                />
                            ))}
                        </ButtonRow>
                    </BuilderColumn>
                    <ColumnPadding>
                        {/* {showNeedNameError && (
                            <SaveError>Please add a company first</SaveError>
                        )} */}
                        {saveStatus !== '' && (
                            <Button
                                style={{ marginRight: 0, marginLeft: 0 }}
                                onClick={() => this.handleFormStorage()}
                                loading={saveStatus === 'saving' ? 'true' : ''}
                                error={saveStatus === 'error'}
                            >
                                Save Form ({saveStatus})
                            </Button>
                        )}
                        {saveStatus !== '' && (
                            <Button
                                style={{
                                    border: 'none',
                                    backgroundColor: 'inherit',
                                    color: 'var(--mainColor)',
                                    marginLeft: '10px',
                                }}
                                onClick={this.openModal}
                            >
                                Cancel
                            </Button>
                        )}
                        <Modal
                            isOpen={this.state.modalIsOpen}
                            onAfterOpen={this.afterOpenModal}
                            onRequestClose={this.closeModal}
                            style={customStyles}
                            contentLabel="Modal"
                        >
                            <Close
                                onClick={this.closeModal}
                                className="material-icons"
                                style={{ color: 'var(--lightMainColor)' }}
                            >
                                close
                            </Close>
                            <ModalText1>
                                Are you sure you want to discard your changes and exit the form builder?
                            </ModalText1>
                            <SameLine>
                                <Link
                                    style={{
                                        border: 'none',
                                        backgroundColor: 'var(--mainColor)',
                                        color: 'white',
                                        marginLeft: '10px',
                                        textDecoration: 'none',
                                        borderRadius: '4px',
                                        padding: '5px',
                                    }}
                                    to="/form/manage"
                                >
                                    Yes
                                </Link>
                                <B1
                                    style={{
                                        border: 'none',
                                        backgroundColor: 'inherit',
                                        color: 'var(--mainColor)',
                                        marginLeft: '10px',
                                        fontSize: 'unset',
                                    }}
                                    onClick={this.closeModal}
                                >
                                    No
                                </B1>
                            </SameLine>
                        </Modal>
                    </ColumnPadding>
                </BuilderControlPanel>
            </div>
        )
    }

    renderLeft() {
        // NOTE this is the wrapper for the preview side
        // this will have the 3 toggleable sections

        const { formItems, currentlyPreviewing, selectedValues, selectedForm } = this.state

        const isEmpty = !formItems || (Object.keys(formItems).length === 0 && formItems.constructor === Object)

        const showNoEntryMessage = <NoEntries>Add or drag form components here.</NoEntries>

        const formItemsSorted = displayByOrder(formItems)

        const { match } = this.props
        const isCreate = !match.params.formId
        const entityUuid = isCreate
            ? new URLSearchParams(window.location.search).get('entityUuid') || match.params.entityUuid
            : selectedForm.entityUuid

        return (
            <FormContextHolder orgUuid={entityUuid}>
                <BuilderColumn>
                    {currentlyPreviewing === 'Edit' && (
                        <SelectedList noElements={isEmpty}>
                            {isEmpty && showNoEntryMessage}

                            <SelectedElementsDrag formItems={formItemsSorted}>
                                {({ selectedElement, index, provided, uuid }) =>
                                    this.renderSelectedEdit(selectedElement, index, provided, uuid)
                                }
                            </SelectedElementsDrag>
                        </SelectedList>
                    )}

                    {currentlyPreviewing === 'Preview' && (
                        <SelectedList preview>
                            {formItemsSorted.map((item, index) =>
                                this.renderSelectedPreview(formItems[item.uuid], index)
                            )}
                        </SelectedList>
                    )}

                    {currentlyPreviewing === 'Data' && isDeveloper ? (
                        <SelectedList>
                            <span>Form Info</span>
                            <JsonData data={selectedForm} />

                            <span>Selected Elements</span>
                            <JsonData data={formItemsSorted} />

                            <span>Form values</span>
                            <JsonData data={selectedValues} />
                        </SelectedList>
                    ) : (
                        ''
                    )}
                </BuilderColumn>
            </FormContextHolder>
        )
    }

    renderRight() {
        //NOTE this is the list of elements the user can choose to create the form
        //TODO need to find a way to refactor this and keep it easy to follow
        //the api for this plugin sucks... makes it damn near impossible to keep simple
        //this is the result of too much render props
        const { currentlyPreviewing } = this.state
        if (currentlyPreviewing !== 'Edit') {
            return null
        }
        return (
            <ComponentsColumn>
                <SubHeader subText="Click to add or drag and drop.">Form Components</SubHeader>

                <Droppable droppableId="availableElements" type="formElements">
                    {(provided) => (
                        <div ref={provided.innerRef}>
                            <AvailableElementsDrag
                                handleAddElement={(entryName) => this.handleAddElement(entryName)}
                                elements={availableElements}
                            />

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </ComponentsColumn>
        )
    }

    render() {
        const { doneLoading, saveStatus } = this.state
        const { forms, match, history } = this.props
        const params = new URLSearchParams(window.location.search)
        const entityUuid = params.get('entityUuid') || match.params.entityUuid
        const formType = params.get('form') || 'system'
        const form = forms[match.params.formId] || forms[entityUuid]
        //need to handle some statuses before we get to the page
        if (!doneLoading) return <InitialLoadSpinner showing />
        let header = (
            <ButtonWithIcon
                textButton={true}
                size={30}
                icon="arrow_back"
                style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 0,
                    //little hacky but makes the left edge align
                }}
                onClick={this.openModal}
            >
                <h1
                    style={{
                        fontWeight: '400',
                        fontSize: '1.8em',
                        color: 'var(--secondaryColor)',
                        position: 'relative',
                        left: '13px',
                    }}
                >
                    Pre-Built Form
                </h1>
            </ButtonWithIcon>
        )

        if (form && form.entityUuid) {
            header = (
                <HeaderWithArrow
                    history={history}
                    headerText={`Custom Form ${form.entityDisplayName ? `for ${form.entityDisplayName}` : ''}`}
                    backLink={`/form/manage/${form.entityUuid}`}
                />
            )
        } else if (entityUuid || formType === 'custom') {
            header = (
                <HeaderWithArrow history={history} headerText="Custom Form" backLink={`/form/manage/${entityUuid}`} />
            )
        }

        return (
            <div style={{ maxWidth: 1200, margin: '0px auto' }}>
                {header}
                <Prompt
                    when={
                        saveStatus === 'unsaved' &&
                        !history.location.pathname.includes('add') &&
                        !history.location.pathname.includes('edit')
                    }
                    message={(location) => `Are you sure you want to go to ${location.pathname}`}
                />

                <DragDropContext onDragEnd={this.handleDragEnd}>
                    <FormControlContainer>{this.renderFormControls()}</FormControlContainer>
                    <BuilderContainer>
                        {this.renderLeft()}
                        {this.renderRight()}
                    </BuilderContainer>
                </DragDropContext>
            </div>
        )
    }
}

const mapStateToProps = ({ forms, user, entity }) => ({
    forms: forms.formsList,
    companyFormData: forms.companyFormData,
    user,
    entity,
})

export default connect(mapStateToProps, { updateForm, fetchForms }, null, { pure: false })(FormEditor)

const SelectedElementsDrag = (props) => {
    const { formItems, children } = props

    return (
        <Droppable droppableId="formItems" type="formElements">
            {(provided) => (
                <div
                    style={{
                        minHeight: 200,
                        maxWidth: 750,
                    }}
                    ref={provided.innerRef}
                >
                    {formItems.map((item, index) => (
                        <Draggable key={item.uuid} draggableId={item.uuid} index={index}>
                            {(provided, snapshot) => (
                                <div>
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.dragHandleProps}
                                        style={{
                                            ...getItemStyle(provided.draggableProps.style, snapshot.isDragging),
                                            padding: 0,
                                        }}
                                    >
                                        {children({
                                            selectedElement: item,
                                            index,
                                            provided,
                                            uuid: item.uuid,
                                        })}
                                    </div>
                                    {provided.placeholder}
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

//NOTE this should be used as a grouping for available elements
const AvailableElementsDrag = (props) => {
    const { handleAddElement, elements } = props

    //grabbing only the elements we have enabled as some can be disabled
    const enabledElements = Object.keys(elements).filter((name) => !elements[name].disable)

    return (
        <>
            {enabledElements.map((entryName, index) => (
                <Draggable key={entryName} index={index} draggableId={entryName}>
                    {(provided, snapshot) => (
                        <ElementCard isDragging={snapshot.isDragging} onClick={() => handleAddElement(entryName)}>
                            <div
                                ref={provided.innerRef}
                                style={getItemStyle(provided.draggableProps.style, snapshot.isDragging)}
                                {...provided.dragHandleProps}
                            >
                                <ElementTitle>{elements[entryName].label}</ElementTitle>
                            </div>

                            {provided.placeholder}
                        </ElementCard>
                    )}
                </Draggable>
            ))}
        </>
    )
}

const BuilderContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-content: flex-start;
    align-items: flex-start;
    margin-left: auto;
    margin-right: auto;
    height: 100%;
    position: relative;
    margin-top: 30px;
    border-top: 2px solid var(--gray3);
`

const BuilderColumn = styled.div`
    flex: 2;
    padding: 30px 15px 50px;
`

const ColumnPadding = styled.div`
    top: 0;
    flex: 1;
    padding: 30px 15px 0;
`

export const FlexContainer = styled.div`
    display: flex;
    align-items: center;
    min-height: 40px;
    flex: 1;
`

export const CheckboxStyled = styled(Checkbox)`
    display: flex !important;
    ${(props) => (props.$certificationnumber ? 'width: 50px !important;' : '')};
`

export const IconContainer = styled.div`
    margin: 5px 0 10px;
    display: flex;

    span {
        cursor: pointer;
    }
`
export const RightSide = styled.div`
    margin-left: auto;
`

export const Label = styled.label`
    padding-bottom: 10px;
`

const CertificationStatementsBlock = styled.div`
    max-width: 50%;
    padding: 0px 15px;
`

const ComponentsColumn = styled.div`
    position: sticky;
    top: 0;
    flex: 1;
    overflow-y: scroll;
    max-height: 100vh;
    padding: 30px 15px 0;
`

const BuilderControlPanel = styled(BuilderContainer)`
    display: flex;
    flex-direction: column;
    border: none;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    justify-content: space-around;
    margin-top: 0px;
`

const FormControlContainer = styled.div`
    padding: 15px 15px 0;
`

const BuilderButtons = styled.div`
    justify-content: space-between;
    position: relative;
    margin: 0 0 15px 0;
`

const NoEntries = styled.div`
    position: absolute;
    margin: auto;
    bottom: 0;
    top: 0;
    left: 0;
    right: 0;
    height: 20px;
    text-align: center;
    font-style: italic;
    opacity: 0.7;
`

const SelectedList = styled.ul`
    position: relative;
    padding: 0;
    list-style: ${(props) => (props.preview ? 'none' : 'disc')};

    ${(p) =>
        p.noElements &&
        `
       border:2px dashed var(--black2);
       border-radius:3px;
    `};
`

const SelectedEntryWrapper = styled.li`
    min-height: ${(p) => (p.preview ? '0px' : '70px')};
    background: ${(p) => (p.preview ? 'transparent' : '#f9f9f9')};
    overflow: hidden;
    margin-bottom: 10px;
    padding-bottom: 15px;
    overflow: hidden;
    background: white;
    display: flex;
    flex-direction: column;
`

const ElementCard = styled.div`
    border-radius: 4px;
    background: white;
    overflow: hidden;
    margin: 0 0 -10px;
`

const ElementTitle = styled.h3`
    font-size: 16px;
    text-align: left;
    font-weight: 400;
    color: var(--gray18);
    margin: 0px;
`
export const SameLine = styled.div`
    float: right;
    position: relative;
    top: 93px;
`
export const B1 = styled.button`
    border: none;
    background-color: inherit;
    color: var(--mainColor);
    margin-left: 3px;
`
export const Close = styled(FontIcon)`
    font-size: 30px !important;
    position: absolute !important;
    top: 10px;
    right: 10px;
    cursor: pointer;
`
export const ModalText1 = styled.div`
    position: relative;
    top: 42px;
    line-height: 28px;
    font-weight: 600;
    left: 20px;
`
