import { SalesforceService } from "./../../../../services/salesforce.service";
import { ActivatedRoute, Router } from "@angular/router";
import { CustomerService } from "../../../../services/customer.service";
import countryCodes from "country-codes-list";
import { Country } from "src/app/models/countries";

import { Component, Inject, OnInit } from "@angular/core";
import { CountriesService } from "src/app/services/countries.service";
import { Customer } from "src/app/models/customer";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs/internal/Observable";
import { map, startWith } from "rxjs/operators";
import {
  FormGroup,
  FormControl,
  Validators,
  FormBuilder,
} from "@angular/forms";

@Component({
  selector: "app-customer-form",
  templateUrl: "./customer-form.component.html",
  styleUrls: ["./customer-form.component.scss"],
})
export class CustomerFormComponent implements OnInit {
  customerForm: FormGroup;
  editMode: boolean;
  countries: Country[];
  nationality = new FormControl(
    this.data?.nationality ? this.data?.nationality : "",
    [Validators.required]
  );
  gender = new FormControl(this.data?.gender ? this.data?.gender : "", [
    Validators.required,
  ]);
  countryCode = new FormControl(
    this.data?.countryCode ? this.data?.countryCode : "",
    [Validators.required]
  );
  is_enabled: FormControl = new FormControl(
    this.data?.is_enabled ? this.data?.is_enabled : true,
    [Validators.required]
  );
  genderArray = ["Female", "Male", "Not specified"];
  memberTypeArray = ["Regular", "Privilege"];
  url: string;
  countryCodesObject: any;
  type: string;
  countryCodesArray: { country: string; value: string }[] = [];
  filteredOptions: Observable<{ country: string; value: string }[]>;
  constructor(
    private readonly httpClient: HttpClient,
    private readonly fb: FormBuilder,
    private readonly salesForceService: SalesforceService,
    private readonly countryService: CountriesService,
    private readonly customerService: CustomerService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private _snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CustomerFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Customer
  ) {}

  ngOnInit(): void {
    this.type =
      this.router.url.indexOf("regular") > -1
        ? "Regular"
        : this.router.url.indexOf("privilege") > -1
        ? "Privilege"
        : "Default";
    this.filteredOptions = this.countryCode.valueChanges.pipe(
      startWith(""),
      map((value: string) => this.filter(value || ""))
    );
    this.countryCodesObject = countryCodes.customList(
      "countryNameEn",
      "+{countryCallingCode}"
    );
    Object.keys(this.countryCodesObject).forEach((key) => {
      this.countryCodesArray.push({
        country: key,
        value: this.countryCodesObject[key],
      });
    });
    // console.log(this.countryCodesArray);

    this.customerService.getCustomersAll().subscribe((data) => {
      this.customerService.setCustomersData(data);
    });
    this.url = this.router.url;
    this.countries = this.countryService.countries;

    this.customerForm = this.fb.group({
      firstName: new FormControl(
        this.data?.firstName ? this.data?.firstName : "",
        [Validators.required, Validators.minLength(3)]
      ),
      lastName: new FormControl(
        this.data?.lastName ? this.data?.lastName : "",
        [Validators.required, Validators.minLength(3)]
      ),
      countryCode: this.countryCode,
      email: new FormControl(this.data?.email ? this.data?.email : "", [
        Validators.required,
        Validators.email,
      ]),
      gender: this.gender,
      nationality: this.nationality,
      age: new FormControl(this.data?.age ? this.data?.age : "", [
        Validators.required,
      ]),
      phone: new FormControl(this.data?.phone ? this.data?.phone : "", [
        Validators.required,
      ]),
      passportOrID: new FormControl(
        this.data?.passportOrID ? this.data?.passportOrID : ""
      ),
      is_enabled: this.is_enabled,
    });
  }

  filter(value: string): { country: string; value: string }[] {
    const filterValue = value.toLowerCase();
    return this.countryCodesArray.filter((option) =>
      option.value.toLowerCase().includes(filterValue)
    );
  }

  submitCustomerData(): void {
    if (this.customerForm.valid) {
      //on edit
      if (this.data) {
        const customer = this.customerForm.value as Customer;
        customer.id = this.data.id;
        this.customerService.editCustomer(customer).subscribe(
          (data) => {
            console.log(data);
            this.dialogRef.close();
            let customerList = this.customerService.customers;
            console.log(customerList, "list");
            const customerIndex = customerList.findIndex(
              (elt) => elt.id == this.data.id
            );
            customerList[customerIndex] = customer;
            console.log(customerList[customerIndex], "users edited");
            this.customerService.setCustomersData(customerList);
            this._snackBar.open("User Details edited successfully", "X", {
              horizontalPosition: "center",
              verticalPosition: "top",
            });
          },
          (error) => {
            console.log(this.data);
            this._snackBar.open(error, "X", {
              horizontalPosition: "center",
              verticalPosition: "top",
            });
          }
        );
      } else {
        //on add
        const customerList = this.customerService.customers;
        const customer = this.customerForm.value as Customer;
        const customerExist = customerList.filter(
          (elt) => elt.email == customer.email
        );
        const qidExist = customerList.filter(
          (elt) => elt.passportOrID == customer.passportOrID
        );
        if (customerExist.length > 0) {
          this._snackBar.open("Customer email  already exist", "X", {
            horizontalPosition: "center",
            verticalPosition: "top",
          });
        } else {
          if (qidExist.length > 0) {
            this._snackBar.open("Customer Passport or QID already exist", "X", {
              horizontalPosition: "center",
              verticalPosition: "top",
            });
          }
          else {
          const totalCustomer = this.customerService.customers.length;
          const totalString = totalCustomer.toString();
          customer.dateCreated = new Date();

          customer.customerId =
            "MOQ-CUST" + Math.floor(new Date().getTime() + Math.random());

          this.customerService.addCustomer(customer).subscribe(
            (data) => {
              this.salesForceService.loginOnSalesForce().subscribe((data) => {
                console.log(data, "sales force");
              });
              this.dialogRef.close();
              let customerList = this.customerService.customers$.getValue();
              customerList.unshift(customer);
              this.customerService.setCustomersData(customerList);

              this._snackBar.open("User Data added successfully", "X", {
                horizontalPosition: "center",
                verticalPosition: "top",
              });
            },
            (error) => {
              this._snackBar.open(error, "X", {
                horizontalPosition: "center",
                verticalPosition: "top",
              });
            }
          );
        }
      }}
    } else {
      console.log(this.data);
      this._snackBar.open("Some fields are invalid", "X", {
        horizontalPosition: "center",
        verticalPosition: "top",
      });
    }
  }
}
